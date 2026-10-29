import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { mergePass } from '../../src/passes/merge/index.js';
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
      selector(buffer) {
        seen.push(buffer.text());
      },
    };
    await postcss([addRule, hostOf(observe)]).process('a{}', {
      from: undefined,
    });
    assert.deepStrictEqual(seen, ['a', '.added']);
  });
});

/**
 * The names of the blocks a host's pass receives, after a walk that runs
 * discardOverridden.
 * @param {string} css
 * @return {Promise<string[]>}
 */
async function blocksPassed(css) {
  /** @type {string[]} */
  const names = [];
  const pass = {
    pass(_root, _browsers, _options, _result, _table, blocks) {
      for (const block of blocks) {
        names.push(block.type === 'rule' ? block.selector : `@${block.name}`);
      }
    },
    options: {},
    targets: false,
  };
  await postcss([
    hostPlugin(
      [],
      new Map([['discardOverridden', {}]]),
      new Map([['merge', pass]])
    ),
  ]).process(css, { from: undefined });
  return names;
}

test('a host plugin passes the rules and at-rules its walk reached to each pass, in document order', async () => {
  assert.deepStrictEqual(
    await blocksPassed('@import "x";a{color:red}@media print{b{color:red}}'),
    ['@import', 'a', '@media', 'b']
  );
});

// The earlier @keyframes is overridden, so its blocks are no longer in the
// stylesheet the pass edits.
test('a host plugin leaves out of the blocks it passes the at-rules that discardOverridden removed, with their rules', async () => {
  assert.deepStrictEqual(
    await blocksPassed(
      '@keyframes a{from{top:0}}@keyframes a{to{top:1px}}c{color:red}'
    ),
    ['@keyframes', 'to', 'c']
  );
});

// The merge pass reads the blocks the walk reached, so it walks nothing itself.
test('a host plugin with a stage and the merge pass walks the root once', async () => {
  const root = postcss.parse('a{color:red}@media print{b{color:red}}');
  const walk = root.walk;
  let count = 0;
  root.walk = (...args) => {
    count++;
    return walk.apply(root, args);
  };
  const merge = { pass: mergePass, options: {}, targets: false };
  await postcss([
    hostPlugin(
      [{ entry: { create: () => ({}) }, options: {}, targets: false }],
      new Map(),
      new Map([['merge', merge]])
    ),
  ]).process(root, { from: undefined });
  assert.equal(count, 1);
});
