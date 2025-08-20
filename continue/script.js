import {
  concatNoteSequences,
  fetchCheckpoints,
  readFile,
  writeFiles,
} from '../public/magenta-helpers.js';

// Fake modules because Skypack can't build.
const { sequences } = window.core;
const { quantizeNoteSequence, unquantizeSequence } = sequences;
const { MusicRNN } = window.music_rnn;

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
    model: 'MusicRNN',
    id: Array.from(form.querySelectorAll('[name="mode"]')).map(
      ({ value }) => value
    ),
  });

  const models = checkpoints.reduce(
    (agg, { id, url }) => ({ ...agg, [id]: new MusicRNN(url) }),
    {}
  );

  /**
   * Functions
   */

  async function magentaContinue({
    input,
    mode,
    length,
    temperature,
    variations,
  } = {}) {
    const model = models[mode];
    const returnSequences = [];

    const inSequence = await readFile(input);
    // Convert length in bars to length in 16 notes/steps.
    const steps = length * 16;

    for (let i = 0; i < variations; i += 1) {
      let continuation = await model.continueSequence(
        quantizeNoteSequence(inSequence, 4),
        steps,
        temperature
      );
      continuation = unquantizeSequence(continuation, inSequence.tempos[0].qpm);
      continuation = concatNoteSequences(inSequence, continuation);
      continuation.notes.forEach((n) => (n.velocity = 100));
      returnSequences.push(continuation);
    }

    return returnSequences;
  }

  /**
   * Event listeners
   */

  // Initialize the models.
  await Promise.all(Object.keys(models).map((key) => models[key].initialize()));
  submit.textContent = 'Generate';
  submit.toggleAttribute('disabled', false);

  // Disable submit if invalid.
  form.addEventListener('change', () => {
    submit.toggleAttribute('disabled', !form.reportValidity());
  });

  // Generate the file.
  form.addEventListener('submit', async (e) => {
    submit.textContent = 'Generating…';
    submit.toggleAttribute('disabled', true);

    try {
      const output = await magentaContinue(e.currentTarget.state);
      writeFiles(output, 'CONTINUE');
    } catch (err) {
      toast.open(err.message);
    }

    submit.textContent = 'Generate';
    submit.toggleAttribute('disabled', !form.reportValidity());
  });
}

init();
