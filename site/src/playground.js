import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { playgroundSetup } from './playground-editor.js';

// https://github.com/eslint/website/blob/22488d817a09f0bacea3b32c82c8bc7dd72eb2d9/src/js/demo/utils/unicode.js
/** @param {string} text */
function encodeToBase64(text) {
  return window.btoa(unescape(encodeURIComponent(text)));
}
/**
 * @param {string} base64
 * @return {string}
 */
function decodeFromBase64(base64) {
  return decodeURIComponent(escape(window.atob(base64)));
}
/** @return {null | {input: string, config: string }} */
function getUrlState() {
  const maxHashLength = 300000;
  const validConfigs = new Set([
    'cssnano-preset-lite',
    'cssnano-preset-default',
    'cssnano-preset-advanced',
  ]);

  /* Reject huge hashes
     (longer than the whole Bootstrap CSS) */
  if (window.location.hash.length > maxHashLength) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      decodeFromBase64(window.location.hash.replace(/^#/u, ''))
    );
    if (Object.keys(parsed).length > 2) {
      return null;
    }
    if (!validConfigs.has(parsed.config)) {
      return null;
    }
    if (typeof parsed.input !== 'string') {
      return null;
    }
    return parsed;
  } catch (err) {
    return null;
  }
}

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
/**
 * @param {string} input
 * @param {string} config
 */
function saveState(input, config) {
  const serializedState = JSON.stringify({
    input,
    config,
  });

  if (typeof window !== 'undefined') {
    window.location.hash = encodeToBase64(serializedState);
  }
}

const urlState = getUrlState();
const { input, config } = urlState || {
  input: '/* write your css below */',
  config: 'cssnano-preset-default',
};

const inputView = new EditorView({
  state: EditorState.create({
    doc: input,
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
presetSelector.value = config;
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

document
  .getElementById('saveButton')
  .addEventListener('click', () =>
    saveState(
      inputView.state.doc.sliceString(0, inputView.state.doc.length),
      presetSelector.value
    )
  );
