// Counts the reducer runs of the record walk over a generated stylesheet. Each
// plan folds a declaration's value once per context and comment-free source,
// so the runs stay at the number of distinct (plan, context, comment-free
// value) triples however many declarations spell them. Two values that differ
// only in a removed comment fold once.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { hostPlugin } from '../../src/pipeline/host.js';

/**
 * The host of one stage that counts the runs of its reducer for `color`, and
 * removes every comment whose text contains `drop`.
 *
 * @returns {{plugin: import('postcss').Plugin, runs: () => number}}
 */
function countingHost() {
  let runs = 0;
  const stage = {
    comments: () => (comment) => comment.includes('drop'),
    forProperty: (property) =>
      property === 'color'
        ? () => {
            runs++;
          }
        : null,
  };
  const plugin = hostPlugin([
    { entry: { create: () => stage }, options: {}, targets: false },
  ]);
  return { plugin, runs: () => runs };
}

/**
 * A stylesheet of `n` rules and `n` keyframes. The values cycle through seven
 * texts, and the keyframes spell each one with a comment that is removed, so
 * the distinct triples are seven in the plain context and seven in keyframes.
 *
 * @param {number} n
 * @returns {string}
 */
function sheetOf(n) {
  let css = '';
  for (let i = 0; i < n; i++) {
    const k = i % 7;
    css += `a${i}{color:c${k}}@keyframes f${i}{from{color:c${k}/* drop */ x}}`;
  }
  return css;
}

/**
 * @param {string} css
 * @returns {number} the reducer runs of the record walk over `css`
 */
function runsOf(css) {
  const { plugin, runs } = countingHost();
  postcss([plugin]).process(css, { from: undefined }).sync();
  return runs();
}

test('the reducer runs stay at the distinct triples, at two sizes of stylesheet', () => {
  const small = runsOf(sheetOf(50));
  const large = runsOf(sheetOf(100));
  assert.equal(small, 14);
  assert.equal(large, 14);
});

test('two values that differ only in a removed comment fold once', () => {
  assert.equal(runsOf('a{color:red/* drop */ blue}b{color:red blue}'), 1);
});
