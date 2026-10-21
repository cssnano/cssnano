import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareSizes } from '../../corpusSize.js';

test('compareSizes lists only the fixtures that grew', () => {
  const { grew } = compareSizes({ a: 10, b: 10 }, { a: 11, b: 9 });

  assert.deepEqual(grew, ['a']);
});

test('compareSizes does not flag a fixture whose size is unchanged', () => {
  const { grew } = compareSizes({ a: 10 }, { a: 10 });

  assert.deepEqual(grew, []);
});

test('compareSizes totals the base, candidate and delta across fixtures', () => {
  const { total } = compareSizes({ a: 10, b: 20 }, { a: 8, b: 25 });

  assert.deepEqual(total, { base: 30, candidate: 33, delta: 3 });
});

test('compareSizes rejects a candidate that dropped a fixture', () => {
  assert.throws(() => compareSizes({ a: 10, b: 10 }, { a: 10 }), /missing b/v);
});

test('compareSizes rejects a candidate that added a fixture', () => {
  assert.throws(() => compareSizes({ a: 10 }, { a: 10, c: 3 }), /extra c/v);
});
