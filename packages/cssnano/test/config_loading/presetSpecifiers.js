import { fileURLToPath } from 'node:url';

// Configuration modules in a temporary directory outside the package import a
// preset by its absolute location.

/**
 * @param {'lite' | 'default'} name
 * @returns {URL}
 */
const presetURL = (name) =>
  new URL(`../../src/presets/${name}.js`, import.meta.url);

/**
 * CommonJS `require()` takes a file path.
 * @param {'lite' | 'default'} name
 * @returns {string} a JavaScript string literal
 */
export const presetRequire = (name) =>
  JSON.stringify(fileURLToPath(presetURL(name)));

/**
 * ES module `import` takes a URL, since a Windows path such as `D:\` reads as
 * a URL scheme.
 * @param {'lite' | 'default'} name
 * @returns {string} a JavaScript string literal
 */
export const presetImport = (name) => JSON.stringify(presetURL(name).href);
