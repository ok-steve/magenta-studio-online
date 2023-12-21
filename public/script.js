// Disable normal form submission
document
  .querySelector('form:not([method]):not([action])')
  .addEventListener('submit', (e) => {
    e.preventDefault();
  });

// Sync input and output values
document.querySelectorAll('input[type="range"][id]').forEach((input) => {
  input.addEventListener('input', (e) => {
    const id = e.target.id;
    const output = document.querySelector(`output[for="${id}"]`);

    if (output !== null) {
      output.textContent = e.target.value;
    }
  });
});
