import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { onlyTransform } from './onlyTransform.js';

// Not a browserslist query, so resolving it throws.
const invalidTargets = { query: 'not a real browser' };

test('the mergeRules transform resolves the browser targets, so an invalid query throws', async () => {
  const plugin = onlyTransform(['mergeRules'])({
    browserslist: invalidTargets,
  });
  await assert.rejects(
    async () =>
      postcss([plugin]).process('a{color:red}b{color:red}', {
        from: undefined,
      }),
    /not a real browser/v
  );
});

test('the merge plugin resolves the browser targets with rule merging off, so an invalid query throws', async () => {
  const plugin = onlyTransform(['mergeLonghand', 'discardDuplicates'])({
    browserslist: invalidTargets,
  });
  await assert.rejects(
    async () =>
      postcss([plugin]).process('a{color:red}b{color:red}', {
        from: undefined,
      }),
    /not a real browser/v
  );
});
