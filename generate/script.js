import { fetchCheckpoints, writeFiles } from '../public/magenta-helpers.js';

// Fake modules because Skypack can't build.
const { sequences } = window.core;
const { unquantizeSequence } = sequences;
const { MusicVAE } = window.music_vae;

async function init() {
  /**
   * Elements
   */

  const form = document.querySelector('app-form');
  const submit = form.querySelector('[type="submit"]');

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

  async function magentaGenerate({ mode, variations, temperature }) {
    const model = models[mode];
    let outSequences = await model.sample(variations, temperature);
    outSequences = outSequences.map((s) => unquantizeSequence(s, 60));
    outSequences.forEach((seq) => seq.notes.forEach((n) => (n.velocity = 100)));
    return outSequences;
  }

  /**
   * Event listeners
   */

  // Initialize the models.
  await Promise.all(Object.keys(models).map((key) => models[key].initialize()));
  submit.textContent = 'Generate';
  submit.toggleAttribute('disabled', !form.reportValidity());

  // Generate the file.
  form.addEventListener('submit', async (e) => {
    submit.textContent = 'Generating…';
    submit.toggleAttribute('disabled', true);

    try {
      const output = await magentaGenerate(e.currentTarget.state);
      writeFiles(output, 'GENERATE');
    } catch (err) {
      console.warn(err.message);
    }

    submit.textContent = 'Generate';
    submit.toggleAttribute('disabled', !form.reportValidity());
  });
}

init();
