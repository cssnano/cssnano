import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resolveTargets } from '../../src/utils/browserTargets.js';
import presetTargets from '../../src/utils/presetTargets.js';

/**
 * @param {string[]} list what browserslist resolves
 * @param {string} [from] the path of the file being processed
 * @return {{warnings: string[], result: {opts: object, warn: (text: string) => void}, browserslist: any}}
 */
function resolveWith(list, from = undefined) {
  /** @type {string[]} */
  const warnings = [];
  const result = {
    opts: { from },
    warn: (/** @type {string} */ text) => warnings.push(text),
  };
  const browserslist = Object.assign(() => list, {
    loadConfig: () => undefined,
  });
  resolveTargets({ overrideBrowserslist: 'any' }, result, browserslist);
  return { warnings, result, browserslist };
}

describe('resolveTargets warning about targets missing from caniuse-lite', () => {
  test('warns that caniuse-lite does not list a version of a browser it knows', () => {
    const { warnings } = resolveWith(['chrome 99999', 'chrome 120']);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /chrome 99999.*caniuse-lite/v);
  });

  test('does not warn for an engine that caniuse-lite has no data for', () => {
    assert.deepEqual(resolveWith(['node 20']).warnings, []);
  });

  test('warns once per file', () => {
    const { warnings, result, browserslist } = resolveWith(['chrome 99999']);
    resolveTargets({ overrideBrowserslist: 'any' }, result, browserslist);
    assert.equal(warnings.length, 1);
  });

  // PostCSS has no notion of a build, so a path sequence cannot tell a
  // rebuild of one file from a file of the same build.
  test('warns on every file, including files that a watch rebuild processes one at a time', () => {
    const counts = ['/a.css', '/b.css', '/b.css', '/a.css'].map(
      (from) => resolveWith(['chrome 99998'], from).warnings.length
    );
    assert.deepEqual(counts, [1, 1, 1, 1]);
  });

  test('warns that caniuse-lite does not list a browser that browserslist resolved from a newer copy', () => {
    const { warnings } = resolveWith(['futurebrowser 5', 'chrome 120']);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /futurebrowser 5.*caniuse-lite/v);
  });

  test('does not warn for electron, an engine that caniuse-lite has no data for', () => {
    assert.deepEqual(resolveWith(['electron 30.0']).warnings, []);
  });

  test('does not warn for a target without a version, which cannot be looked up', () => {
    assert.deepEqual(resolveWith(['chrome']).warnings, []);
  });
});

describe('resolveTargets with targets from a preset', () => {
  // The preset writes its targets over the target options a user set on the
  // plugin, and records the replaced ones under the symbol.
  const fromPreset = {
    overrideBrowserslist: 'chrome 150',
    [presetTargets]: {
      plugin: 'mergeRules',
      ignored: ['overrideBrowserslist'],
    },
  };

  /** @return {{queries: unknown[], warnings: string[]}} */
  function resolveFromPreset() {
    /** @type {unknown[]} */
    const queries = [];
    /** @type {string[]} */
    const warnings = [];
    const browserslist = Object.assign(
      (/** @type {unknown} */ query) => {
        queries.push(query);
        return ['chrome 120'];
      },
      { loadConfig: () => undefined }
    );
    const result = {
      opts: {},
      warn: (/** @type {string} */ text) => warnings.push(text),
    };
    resolveTargets(fromPreset, /** @type {any} */ (result), browserslist);
    return { queries, warnings };
  }

  test('uses the query in the plugin options, where the preset put its own', () => {
    assert.deepEqual(resolveFromPreset().queries, ['chrome 150']);
  });

  test('warns that the target option the user set on the plugin is ignored', () => {
    const { warnings } = resolveFromPreset();
    assert.equal(warnings.length, 1);
    assert.match(
      warnings[0],
      /mergeRules option overrideBrowserslist is ignored/v
    );
  });
});
