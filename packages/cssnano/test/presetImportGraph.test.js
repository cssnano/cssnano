import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Module specifiers that a preset may name in its source, found by a text scan.
 * The scan covers static imports, dynamic imports and require calls.
 */
const specifierPattern = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*'([^']+)'/gv;

/**
 * The import specifiers of one module, in source order.
 * @param {string} file
 * @returns {string[]}
 */
function specifiersOf(file) {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(specifierPattern)].map(
    ([, specifier]) => specifier
  );
}

/**
 * Every cssnano module that a preset reaches. The browser-targets module is
 * left out, because the site build replaces it with an embedded copy, so its
 * dependencies never reach a browser.
 *
 * @param {string[]} entries absolute paths of the preset modules
 * @returns {{files: Set<string>, nodeImports: [string, string][]}}
 */
function reachableFrom(entries) {
  const files = new Set();
  /** @type {[string, string][]} */
  const nodeImports = [];
  const queue = [...entries];
  while (queue.length > 0) {
    const file = /** @type {string} */ (queue.pop());
    if (files.has(file)) continue;
    files.add(file);
    for (const specifier of specifiersOf(file)) {
      if (specifier.startsWith('node:')) {
        nodeImports.push([file, specifier]);
      } else if (specifier === '#utils/browser-targets') {
        continue;
      } else if (specifier.startsWith('.') || specifier.startsWith('#')) {
        const url = specifier.startsWith('#')
          ? import.meta.resolve(specifier)
          : new URL(specifier, pathToFileURL(file)).href;
        queue.push(fileURLToPath(url));
      }
    }
  }
  return { files, nodeImports };
}

describe('preset modules for the browser', () => {
  const presets = ['default', 'lite', 'advanced'].map((name) =>
    fileURLToPath(new URL(`../src/presets/${name}.js`, import.meta.url))
  );

  test('no preset reaches a node: built-in through cssnano modules, so the playground can load it', () => {
    const { nodeImports } = reachableFrom(presets);
    assert.deepStrictEqual(nodeImports, []);
  });

  test('the walk reaches the shared configuration code, so the check above is not empty', () => {
    const { files } = reachableFrom(presets);
    const configurePlugins = fileURLToPath(
      new URL('../src/presets/configurePlugins.js', import.meta.url)
    );
    assert.ok(files.has(configurePlugins));
  });
});
