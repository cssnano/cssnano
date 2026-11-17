// Counts the token reads of the counter style call scan. Each call is read up
// to its closing parenthesis once, so the reads stay linear in the value's
// length even when calls nest or never close.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tokenize } from '@csstools/css-tokenizer';
import { addCounterStyleCalls } from '../../src/plugins/postcss-discard-unused/lib/counterStyleUses.js';

/**
 * @param {string} css
 * @returns {number} the indexed token reads of one scan of `css`
 */
function readsOf(css) {
  const tokens = tokenize({ css });
  let reads = 0;
  const counted = new Proxy(tokens, {
    get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/v.test(key)) reads++;
      return Reflect.get(target, key, receiver);
    },
  });
  addCounterStyleCalls(counted, new Set());
  return reads;
}

for (const [label, unit] of [
  ['nested', 'counter('],
  ['unclosed', 'counter(c,'],
]) {
  test(`should read ${label} counter() calls in linear time`, () => {
    const n = 2000;
    const tokens = tokenize({ css: unit.repeat(n) }).length;
    assert.ok(
      readsOf(unit.repeat(n)) <= 3 * tokens,
      `${readsOf(unit.repeat(n))} reads for ${tokens} tokens`
    );
  });
}
