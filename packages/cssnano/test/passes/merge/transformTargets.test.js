import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import merge, { transformPlugin } from '../../../src/passes/merge/index.js';
import { browserTargets } from '#utils/browser-targets';

// Not a browserslist query, so resolving it throws.
const invalidTargets = { query: 'not a real browser' };

test('the discardDuplicates transform runs without resolving the browser targets', async () => {
  const plugin = transformPlugin('discardDuplicates')({
    [browserTargets]: invalidTargets,
  });
  const result = await postcss([plugin]).process('a{color:red;color:red}', {
    from: undefined,
  });
  assert.equal(result.css, 'a{color:red}');
});

test('the mergeRules transform resolves the browser targets, so an invalid query throws', async () => {
  const plugin = transformPlugin('mergeRules')({
    [browserTargets]: invalidTargets,
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
  const plugin = merge({
    rules: false,
    [browserTargets]: invalidTargets,
  });
  await assert.rejects(
    async () =>
      postcss([plugin]).process('a{color:red}b{color:red}', {
        from: undefined,
      }),
    /not a real browser/v
  );
});
