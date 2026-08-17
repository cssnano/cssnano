import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { playgroundSetup } from './playground-editor.js';
import { PlaygroundRunner } from './playground-runner.js';

/** @param {string} message */
function setErrorMessage(message) {
  const errorBox = /** @type {HTMLDivElement} */ (
    document.getElementById('errorBox')
  );
  if (message === '') {
    errorBox.style.display = 'none';
  } else {
    errorBox.style.display = 'inline';
  }
  errorBox.textContent = message;
}

const inputView = new EditorView({
  state: EditorState.create({
    doc: '/* write your css below */',
    extensions: [
      playgroundSetup,
      EditorView.contentAttributes.of({ 'aria-label': 'Input' }),
    ],
  }),
});

const outputView = new EditorView({
  state: EditorState.create({
    doc: '/* your optimized output here */',
    extensions: [
      playgroundSetup,
      EditorView.editable.of(false),
      EditorView.contentAttributes.of({ 'aria-label': 'Output' }),
    ],
  }),
});

/** @type {HTMLDivElement} */
(document.getElementById('editors')).replaceChildren(
  inputView.dom,
  outputView.dom
);

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
  setErrorMessage('Minify unavailable in this browser');
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
    setErrorMessage('');
    const userInput = inputView.state.doc.sliceString(
      0,
      inputView.state.doc.length
    );
    cssMinifier
      .minimizeCss(
        userInput,
        /** @type {import('./types.js').PresetName} */ (presetSelector.value)
      )
      .then((css) => {
        outputView.dispatch(
          outputView.state.update({
            changes: { from: 0, to: outputView.state.doc.length, insert: css },
          })
        );
      })
      .catch((/** @type {unknown} */ err) => {
        if (err instanceof Error) setErrorMessage(err.message);
      })
      .finally(() => {
        running = false;
        runButton.removeAttribute('aria-disabled');
        runButton.removeAttribute('aria-busy');
        runButton.innerText = 'Minimize';
      });
  });
}
