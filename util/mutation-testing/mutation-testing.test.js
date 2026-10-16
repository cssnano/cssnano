import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { applyMutation, mapWithConcurrency } from './mutation-testing.js';
const catalogPromises = [
  import('../../packages/cssnano/mutation/postcss-discard-empty/mutation-catalog.js'),
  import('../../packages/cssnano/mutation/postcss-discard-comments/mutation-catalog.js'),
  import('../../packages/cssnano/mutation/postcss-normalize-whitespace/mutation-catalog.js'),
  import('../../packages/cssnano/mutation/postcss-normalize-positions/mutation-catalog.js'),
  import('../../packages/cssnano/mutation/postcss-merge-longhand/mutation-catalog.js'),
  import('../../packages/cssnano/mutation/postcss-merge-longhand/mutation-catalog-validity.js'),
  import('../../packages/cssnano/mutation/postcss-merge-longhand/mutation-catalog-candidates.js'),
  import('../../packages/cssnano/mutation/postcss-merge-longhand/mutation-catalog-reset-gates.js'),
];

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
    /was not found/v
  );
});

test('rejects a mutation that matches more than once', () => {
  assert.throws(
    () =>
      applyMutation('target target', { find: 'target', replace: 'changed' }),
    /more than once/v
  );
});

test('returns mapped results in input order', async () => {
  const results = await mapWithConcurrency([3, 1, 2], 2, async (item) => {
    await new Promise((resolve) => {
      setTimeout(resolve, item);
    });
    return item * 10;
  });
  assert.deepStrictEqual(results, [30, 10, 20]);
});

test('never runs more workers at once than the concurrency limit', async () => {
  let inFlight = 0;
  let peak = 0;
  await mapWithConcurrency(Array.from({ length: 10 }), 3, async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    inFlight -= 1;
  });
  assert.strictEqual(peak, 3);
});

test('every catalog mutation matches its source once', async () => {
  for (const catalog of await Promise.all(catalogPromises)) {
    for (const mutation of catalog.mutations) {
      const target = fileURLToPath(mutation.target ?? catalog.target);
      const source = readFileSync(target, 'utf8');
      const mutated = applyMutation(source, mutation);
      assert.notStrictEqual(mutated, source, mutation.name);
      assert.strictEqual(readFileSync(target, 'utf8'), source);
    }
  }
});
