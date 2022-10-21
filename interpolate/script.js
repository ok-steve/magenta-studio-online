import {
  fetchCheckpoints,
  readFile,
  writeFiles,
} from '../public/magenta-helpers.js';

// Fake modules because Skypack can't build.
const { sequences } = window.core;
const { quantizeNoteSequence, unquantizeSequence } = sequences;
const { MusicVAE } = window.music_vae;

async function init() {
  /**
   * Elements
   */

  const form = document.querySelector('app-form');
  const submit = form.querySelector('[type="submit"]');
  const toast = document.querySelector('app-toast');

  /**
   * Models
   */

  const checkpoints = await fetchCheckpoints({
    model: 'MusicVAE',
    id: Array.from(form.querySelectorAll('[name="mode"]')).map(
      ({ value }) => value
    ),
  });

  const models = checkpoints.reduce(
    (agg, { id, url }) => ({ ...agg, [id]: new MusicVAE(url) }),
    {}
  );

  /**
   * Functions
   */

  function trim(sequence, beats) {
    sequence.totalQuantizedSteps = beats;
    sequence.totalTime = beats * 0.25;
    sequence.notes = sequence.notes.filter((n) => n.quantizedEndStep < beats);
  }

  function trimOutput(inSequence, outSequences) {
    outSequences.forEach((seq) => {
      trim(seq, inSequence.totalQuantizedSteps);
    });
  }

  function setVelocities(sequences) {
    sequences.forEach((seq) => {
      seq.notes.forEach((n) => (n.velocity = 100));
    });
  }

  function validateSequence(seqA, seqB) {
    const maxBeats = 4 * 16;
    // Make sure they're the same number of measures
    const len = Math.min(
      seqA.totalQuantizedSteps,
      seqB.totalQuantizedSteps,
      maxBeats
    );
    trim(seqA, len);
    trim(seqB, len);
  }

  async function magentaInterpolate({
    mode,
    inputOne,
    inputTwo,
    variations,
    temperature,
  }) {
    const model = models[mode];
    let inputSequenceA = await readFile(inputOne);
    let inputSequenceB = await readFile(inputTwo);
    const quarterNoteSubdiv = 4;
    inputSequenceA = quantizeNoteSequence(inputSequenceA, quarterNoteSubdiv);
    inputSequenceB = quantizeNoteSequence(inputSequenceB, quarterNoteSubdiv);
    validateSequence(inputSequenceA, inputSequenceB);
    let outSequences = await model.interpolate(
      [inputSequenceA, inputSequenceB],
      variations,
      temperature
    );
    outSequences = outSequences.map((s) =>
      unquantizeSequence(s, inputSequenceA.tempos[0].qpm)
    );
    trimOutput(inputSequenceA, outSequences);
    setVelocities(outSequences);
    return outSequences;
  }

  /**
   * Event listeners
   */

  // Initialize the models.
  await Promise.all(Object.keys(models).map((key) => models[key].initialize()));
  submit.textContent = 'Generate';

  // Disable submit if invalid.
  form.addEventListener('change', () => {
    submit.toggleAttribute('disabled', !form.reportValidity());
  });

  // Generate the file.
  form.addEventListener('submit', async (e) => {
    submit.textContent = 'Generating…';
    submit.toggleAttribute('disabled', true);

    try {
      const output = await magentaInterpolate(e.currentTarget.state);
      writeFiles(output, 'INTERPOLATE');
    } catch (err) {
      toast.open(err.message);
    }

    submit.textContent = 'Generate';
    submit.toggleAttribute('disabled', !form.reportValidity());
  });
}

init();
