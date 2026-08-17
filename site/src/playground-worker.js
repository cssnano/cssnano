import { minimize } from './playground-minifier.js';

globalThis.onmessage = async (e) => {
  const { input, config } = e.data;
  globalThis.postMessage(await minimize(input, config));
};
