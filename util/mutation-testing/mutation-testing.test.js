'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { fileURLToPath } = require('node:url');
const { applyMutation } = require('./mutation-testing.mjs');
const catalogPromise =
  import('../../packages/postcss-discard-empty/mutation-catalog.mjs');

test('applies a mutation exactly once', () => {
  const source = 'one; target; three;';
  assert.strictEqual(
    applyMutation(source, { find: 'target', replace: 'changed' }),
    'one; changed; three;'
  );
  assert.strictEqual(source, 'one; target; three;');
});

test('rejects an unmatched mutation', () => {
  assert.throws(
    () => applyMutation('one', { find: 'missing', replace: 'changed' }),
    /was not found/
  );
});

test('rejects a mutation that matches more than once', () => {
  assert.throws(
    () =>
      applyMutation('target target', { find: 'target', replace: 'changed' }),
    /more than once/
  );
});

test('every discard-empty catalog mutation matches its source once', async () => {
  const { target, mutations } = await catalogPromise;
  const source = readFileSync(fileURLToPath(target), 'utf8');

  for (const mutation of mutations) {
    const mutated = applyMutation(source, mutation);
    assert.notStrictEqual(mutated, source, mutation.name);
  }
  assert.strictEqual(readFileSync(fileURLToPath(target), 'utf8'), source);
});
