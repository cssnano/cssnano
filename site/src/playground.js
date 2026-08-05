import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { playgroundSetup } from './playground-editor.js';
/** @param {string} message */
function setErrorMessage(message) {
  const errorBox = document.getElementById('errorBox');
  if (message === '') {
    errorBox.style.display = 'none';
  } else {
    errorBox.style.display = 'inline';
  }
  document.getElementById('errorBox').textContent = message;
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

document
  .getElementById('editors')
  .replaceChildren(inputView.dom, outputView.dom);
const presetSelector = document.getElementById('presetSelector');
presetSelector.value = 'cssnano-preset-default';
const runButton = document.getElementById('runButton');
import('./playground-runner.js')
  .catch(() => setErrorMessage('Loading cssnano failed.'))
  .then((runner) => {
    runButton.innerText = 'Minimize';
    runButton.disabled = false;
    runButton.addEventListener('click', () => {
      runButton.disabled = true;
      runButton.innerText = 'Working…';
      setErrorMessage('');
      const userInput = inputView.state.doc.sliceString(
        0,
        inputView.state.doc.length
      );
      runner
        .runOptimizer(userInput, outputView, presetSelector.value)
        .catch((error) => setErrorMessage(error.message))
        .finally(() => {
          runButton.disabled = false;
          runButton.innerText = 'Minimize';
        });
    });
  });
