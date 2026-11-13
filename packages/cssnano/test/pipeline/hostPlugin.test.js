import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { hostPlugin } from '../../src/pipeline/host.js';
import { runDriver } from '../../src/passes/ir/runDriver.js';

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
      selector(buffer) {
        seen.push(buffer.text());
      },
    };
    await postcss([addRule, hostOf(observe)]).process('a{}', {
      from: undefined,
    });
    assert.deepStrictEqual(seen, ['a', '.added']);
  });

  // A run with stages and no merge builds the records, so the build is counted
  // here and not only when a merge runs.
  test('a host with stages and no merge builds the records of each stylesheet once', async () => {
    const build = runDriver.build;
    let builds = 0;
    runDriver.build = (...args) => {
      builds++;
      return build(...args);
    };
    try {
      await postcss([hostOf({ selector() {} })]).process('a{}', {
        from: undefined,
      });
    } finally {
      runDriver.build = build;
    }
    assert.equal(builds, 1);
  });
});
