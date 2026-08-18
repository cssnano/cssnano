import { PlaygroundRunner } from './playground-runner.js';

const input = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('input')
);
const output = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('output')
);

/** @param {string} message
 * @param {boolean} isError
 */
function setOutput(message, isError) {
  output.value = message;
  output.toggleAttribute('data-has-output', message !== '');
  output.toggleAttribute('data-has-error', isError);
}

const presetSelector = /** @type {HTMLSelectElement} */ (
  document.getElementById('presetSelector')
);
presetSelector.value = 'cssnano-preset-default';

const runButton = /** @type {HTMLButtonElement} */ (
  document.getElementById('runButton')
);
runButton.innerText = 'Minimize';

/** @type {PlaygroundRunner | undefined} */
let cssMinifier;
try {
  cssMinifier = new PlaygroundRunner(
    new Worker(new URL('./playground-worker.js', import.meta.url), {
      type: 'module',
    })
  );
  runButton.disabled = false;
} catch {
  runButton.disabled = true;
  setOutput('Minify unavailable in this browser', true);
}

let running = false;
if (cssMinifier) {
  runButton.addEventListener('click', () => {
    // aria-disabled (not disabled) keeps the button focusable while busy, so
    // a keyboard user doesn't lose focus the moment they activate it; guard
    // re-entrancy explicitly since aria-disabled doesn't block activation.
    if (running) return;
    running = true;
    runButton.setAttribute('aria-disabled', 'true');
    runButton.setAttribute('aria-busy', 'true');
    runButton.innerText = 'Working…';
    output.removeAttribute('data-has-error');
    const userInput = input.value;
    cssMinifier
      .minimizeCss(
        userInput,
        /** @type {import('./types.js').PresetName} */ (presetSelector.value)
      )
      .then((css) => {
        setOutput(css, false);
      })
      .catch((/** @type {unknown} */ err) => {
        if (err instanceof Error) setOutput(err.message, true);
      })
      .finally(() => {
        running = false;
        runButton.removeAttribute('aria-disabled');
        runButton.removeAttribute('aria-busy');
        runButton.innerText = 'Minimize';
      });
  });
}
