import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { hostPlugin } from '../../src/pipeline/host.js';

/**
 * A host plugin's stage member that builds the given stage, with no options.
 * @param {import('../../src/pipeline/host.js').Stage} stage
 */
const hostOf = (...stages) =>
  hostPlugin(
    stages.map((stage) => ({
      entry: { create: () => stage },
      options: {},
      targets: false,
    }))
  );

describe('a host plugin', () => {
  test('runs its stages after the plugins before it have changed the stylesheet', async () => {
    /** @type {string[]} */
    const seen = [];
    const addRule = {
      postcssPlugin: 'add-rule',
      OnceExit(/** @type {import('postcss').Root} */ root) {
        root.append({ selector: '.added' });
      },
    };
    const observe = {
      selector(/** @type {string} */ text) {
        seen.push(text);
        return text;
      },
    };
    await postcss([addRule, hostOf(observe)]).process('a{}', {
      from: undefined,
    });
    assert.deepStrictEqual(seen, ['a', '.added']);
  });
});
