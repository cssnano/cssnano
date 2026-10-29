import assert from 'node:assert/strict';
import { test } from 'node:test';

// The counter must hook the tokenizer before the parser loads it, so the
// parser loads after it.
const { counter } = await import('../../../../util/countTokenize.js');
const { parseSelectorArena } =
  await import('../../src/plugins/postcss-minify-selectors/lib/parseArena.js');

test('parseSelectorArena tokenizes an unbalanced selector once', () => {
  counter.calls.clear();
  parseSelectorArena('a:not(b', { verifyArena: false });
  assert.equal(
    [...counter.calls.values()].reduce((sum, n) => sum + n, 0),
    1
  );
});
