import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staleFiles } from './dataFreshness.js';

test('staleFiles names a generated file whose committed data differs', () => {
  const built = { 'a.json': '{"a":1}\n', 'b.json': '{"b":2}\n' };
  const committed = { 'a.json': '{"a":1}\n', 'b.json': '{"b":3}\n' };
  assert.deepEqual(
    staleFiles(built, (path) => committed[path]),
    ['b.json']
  );
});

test('staleFiles ignores whitespace a formatter changed in the committed file', () => {
  const built = { 'a.json': '{\n  "a": [1, 2]\n}\n' };
  assert.deepEqual(
    staleFiles(built, () => '{"a":[1,\n2]}'),
    []
  );
});

test('staleFiles names a generated file that is not committed', () => {
  assert.deepEqual(
    staleFiles({ 'a.json': '{}\n' }, () => undefined),
    ['a.json']
  );
});

test('staleFiles names a file whose array order differs, as order carries meaning', () => {
  assert.deepEqual(
    staleFiles({ 'a.json': '[1,2]' }, () => '[2,1]'),
    ['a.json']
  );
});

test('staleFiles names a file whose object keys are in another order, as the data is read in that order', () => {
  assert.deepEqual(
    staleFiles({ 'a.json': '{"a":1,"b":2}' }, () => '{"b":2,"a":1}'),
    ['a.json']
  );
});
