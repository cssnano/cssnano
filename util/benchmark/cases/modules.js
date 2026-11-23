// The case modules in precedence order: a later module wins a repeated name.
// Each exports one object of cases, which a run of one case loads alone.

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const caseFiles = [
  'bench-cases-comments.js',
  'bench-cases-font.js',
  'bench-cases-gradients.js',
  'bench-cases-normalize.js',
  'bench-cases-selectors.js',
  'bench-cases-ordered.js',
  'bench-cases-merge.js',
  'bench-cases-stylehacks.js',
  'bench-cases-preset.js',
];

// Resolved against this directory, whichever module asks. A module must
// export exactly one plain object, so a helper or constant it exports is
// never taken for a case.
export async function loadCaseModule(file) {
  const url = pathToFileURL(resolve(import.meta.dirname, file)).href;
  const exports = Object.values(await import(url));
  const [cases] = exports;
  if (
    exports.length !== 1 ||
    typeof cases !== 'object' ||
    cases === null ||
    Object.getPrototypeOf(cases) !== Object.prototype
  ) {
    throw new Error(`${file} must export exactly one plain object of cases`);
  }
  return cases;
}
