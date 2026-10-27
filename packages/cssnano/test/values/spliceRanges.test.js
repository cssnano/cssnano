import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spliceRanges } from '../../src/values/spliceRanges.js';
import { tokensText } from '../../src/values/tokensText.js';
import { tokens } from '../../src/utils/value.js';

test('spliceRanges replaces ascending ranges by their indexes before the call', () => {
  const list = tokens('a b c d');
  const [a, , , , , , d] = list;
  const result = spliceRanges(list, [
    { start: 2, end: 3, tokens: [a, a] },
    { start: 4, end: 5, tokens: [d] },
  ]);
  assert.equal(tokensText(result), 'a ' + 'aa' + ' ' + 'd' + ' d');
});

test('spliceRanges returns a copy of the list when there are no edits', () => {
  const list = tokens('a b');
  const result = spliceRanges(list, []);
  assert.deepEqual(result, list);
  assert.notEqual(result, list);
});

test('spliceRanges does not change the list it reads', () => {
  const list = tokens('a b');
  const before = [...list];
  spliceRanges(list, [{ start: 0, end: 1, tokens: [] }]);
  assert.deepEqual(list, before);
});
