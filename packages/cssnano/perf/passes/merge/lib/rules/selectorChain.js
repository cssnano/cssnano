import assert from 'node:assert/strict';
import postcss from 'postcss';
import { test } from 'node:test';
import { mergePass } from '#passes/merge';
import { tokens } from '../../../../../src/utils/value.js';
import { resolveTargets } from '#utils/browser-targets';

const targets = resolveTargets({}, undefined);

/**
 * The selector tokens the merge pass writes, over a stylesheet of `count`
 * copies of `unit(i)`. The write-back writes each merged selector once, so the
 * tokens of the final selectors are what the pass stores.
 *
 * @param {(i: number) => string} unit
 * @param {number} count
 * @return {number}
 */
function storedTokens(unit, count) {
  let css = '';
  for (let i = 0; i < count; i++) css += unit(i);
  const root = postcss.parse(css);
  mergePass(root, targets, {}, undefined);
  let stored = 0;
  root.walkRules((rule) => {
    stored += tokens(rule.selector).length;
  });
  return stored;
}

/**
 * Asserts that doubling the chain at most doubles the tokens stored, as a
 * list written once at its final size does; writing it on each merge would
 * store a number quadratic in the chain.
 *
 * @param {(i: number) => string} unit
 */
function assertLinearTokens(unit) {
  const half = storedTokens(unit, 5000);
  const full = storedTokens(unit, 10_000);
  assert.ok(half > 0, 'the chain writes no selector tokens');
  assert.ok(full <= 2.1 * half, `${half} tokens at 5,000, ${full} at 10,000`);
}

// Adjacent rules that share a declaration merge into one rule as it absorbs
// each of them, so its list grows by one selector a merge.
test('a chain of 10,000 adjacent merges writes a linear number of selector tokens', () => {
  assertLinearTokens((i) => `.c${i} {color:red}`);
});

// Rules separated by another rule join the first one by repeating its
// declarations, so its list grows by one selector a join.
test('a chain of 10,000 joins by repeated declarations writes a linear number of selector tokens', () => {
  assertLinearTokens((i) => `.c${i} {color:red} .p${i} {margin:${i}px}`);
});
