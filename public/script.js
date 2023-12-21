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
