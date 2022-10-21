import {
  fetchCheckpoints,
  readFile,
  reconstructBySize,
  writeFiles,
} from '../public/magenta-helpers.js';

// Fake modules because Skypack can't build.
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
    id: ['tap2drum_1bar', 'tap2drum_2bar', 'tap2drum_3bar', 'tap2drum_4bar'],
  });

  const models = checkpoints.map(({ url }) => new MusicVAE(url));

  /**
   * Functions
   */

  async function magentaDrumify({ input, temperature }) {
    const inSequence = await readFile(input);
    return await reconstructBySize(inSequence, models, temperature);
  }

  /**
   * Event listeners
   */

  // Initialize the models.
  await Promise.all(models.map((model) => model.initialize()));
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
      const output = await magentaDrumify(e.currentTarget.state);
      writeFiles(output, 'DRUMIFY');
    } catch (err) {
      toast.open(err.message);
    }

    submit.textContent = 'Generate';
    submit.toggleAttribute('disabled', !form.reportValidity());
  });
}

init();
