import assert from 'node:assert/strict';
import postcss from 'postcss';
import { test } from 'node:test';
import { mergePass } from '#passes/merge';
import { walkStylesheet } from '../../../../../src/pipeline/traversal.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import { resolveTargets } from '#utils/browser-targets';

const helpers = { result: { warn() {} } };
const targets = resolveTargets({}, undefined);

/** A text table that counts the tokens of every list stored in it. */
class CountingTable extends TextTable {
  counted = 0;

  /** @type {TextTable['write']} */
  write(node, tokens) {
    this.counted += tokens.length;
    return super.write(node, tokens);
  }

  /** @type {TextTable['record']} */
  record(node, text, tokens) {
    this.counted += tokens.length;
    return super.record(node, text, tokens);
  }
}

/**
 * The tokens the merge pass stores in the text table, which bound the tokens
 * it copies, over a stylesheet of `count` copies of `unit(i)`. The host walk
 * that leaves the selector tokens runs before counting starts.
 *
 * @param {(i: number) => string} unit
 * @param {number} count
 * @return {number}
 */
function storedTokens(unit, count) {
  let css = '';
  for (let i = 0; i < count; i++) css += unit(i);
  const root = postcss.parse(css);
  const table = new CountingTable();
  walkStylesheet(
    [{ selector: (buffer) => buffer.tokens() }],
    root,
    helpers,
    new Map(),
    table
  );
  table.counted = 0;
  mergePass(root, targets, {}, undefined, table);
  return table.counted;
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
  assert.ok(half > 0, 'the chain stores no tokens');
  assert.ok(full <= 2.1 * half, `${half} tokens at 5,000, ${full} at 10,000`);
}

// Adjacent rules that share a declaration merge into one rule as it absorbs
// each of them, so its list grows by one selector a merge.
test('a chain of 10,000 adjacent merges stores a linear number of tokens', () => {
  assertLinearTokens((i) => `.c${i} {color:red}`);
});

// Rules separated by another rule join the first one by repeating its
// declarations, so its list grows by one selector a join.
test('a chain of 10,000 joins by repeated declarations stores a linear number of tokens', () => {
  assertLinearTokens((i) => `.c${i} {color:red} .p${i} {margin:${i}px}`);
});
