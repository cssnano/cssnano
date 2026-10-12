import { minimize } from './playground-minifier.js';

globalThis.onmessage = async (e) => {
  const { input, preset } = e.data;
  globalThis.postMessage(await minimize(input, preset));
};
