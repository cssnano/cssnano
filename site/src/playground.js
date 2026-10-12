import { StatusAnnouncer } from './playground-announcer.js';
import { CssInputError, PlaygroundRunner } from './playground-runner.js';

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @param {{ new (): T }} elementType the expected element class
 * @returns {T}
 */
function getElement(id, elementType) {
  const element = document.getElementById(id);
  if (!(element instanceof elementType)) {
    throw new TypeError(
      `Playground element #${id} is missing or not a ${elementType.name}`
    );
  }
  return element;
}

const input = getElement('input', HTMLTextAreaElement);
const output = getElement('output', HTMLTextAreaElement);
const status = getElement('playgroundStatus', HTMLElement);
const presetSelector = getElement('presetSelector', HTMLSelectElement);
const runButton = getElement('runButton', HTMLButtonElement);

/** @param {string} message
 * @param {boolean} isError
 */
function setOutput(message, isError) {
  output.value = message;
  output.toggleAttribute('data-has-output', message !== '');
  output.toggleAttribute('data-has-error', isError);
}

// Screen readers do not announce textarea value changes, so results and
// errors are mirrored into a status region.
const announcer = new StatusAnnouncer(status);

/** @param {number} bytes */
function formatBytes(bytes) {
  return bytes < 1000
    ? `${bytes} bytes`
    : `${(bytes / 1000).toFixed(1)} kilobytes`;
}

// aria-disabled (not disabled) keeps the button focusable while busy, so a
// keyboard user doesn't lose focus the moment they activate it. The label
// stays "Minify"; the result is the only announcement.
/** @param {boolean} busy */
function setBusy(busy) {
  if (busy) {
    runButton.setAttribute('aria-disabled', 'true');
  } else {
    runButton.removeAttribute('aria-disabled');
  }
}

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
  const message = 'This browser cannot run the minifier';
  setOutput(message, true);
  status.toggleAttribute('data-has-error', true);
  announcer.announce(message);
}

let running = false;
if (cssMinifier) {
  runButton.addEventListener('click', async () => {
    // aria-disabled does not block activation, so the guard against re-entry is explicit.
    if (running) return;
    running = true;
    setBusy(true);
    output.removeAttribute('data-has-error');
    status.removeAttribute('data-has-error');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    const userInput = input.value;
    const presetLabel = presetSelector.selectedOptions[0]?.text ?? '';
    try {
      const css = await cssMinifier.minimizeCss(
        userInput,
        /** @type {import('./types.js').PresetName} */ (presetSelector.value)
      );
      setOutput(css, false);
      announcer.announce(
        `${presetLabel} minified your CSS from ${formatBytes(new Blob([userInput]).size)} to ${formatBytes(new Blob([css]).size)}`
      );
    } catch (/** @type {unknown} */ err) {
      const reason = err instanceof Error ? err.message : String(err);
      // Name the culprit: a syntax error points at the user's CSS, anything else at the minifier.
      const message =
        err instanceof CssInputError
          ? `Could not minify your CSS: ${reason}`
          : `The minifier failed: ${reason}`;
      setOutput(message, true);
      status.toggleAttribute('data-has-error', true);
      // Only bad CSS makes the input invalid; a worker failure leaves it as written.
      if (err instanceof CssInputError) {
        input.setAttribute('aria-invalid', 'true');
        // The status region carries the error text, so the field is read with its message.
        input.setAttribute('aria-describedby', 'playgroundStatus');
      }
      announcer.announce(message);
    } finally {
      running = false;
      setBusy(false);
    }
  });
}
