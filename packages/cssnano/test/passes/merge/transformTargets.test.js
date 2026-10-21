import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import merge from '../../../src/passes/merge/index.js';
import { browserTargets } from '#utils/browser-targets';

// Not a browserslist query, so resolving it throws.
const invalidTargets = { query: 'not a real browser' };

test('the merge plugin with only discardDuplicates runs without resolving the browser targets', async () => {
  const plugin = merge({
    enabled: new Set(['discardDuplicates']),
    [browserTargets]: invalidTargets,
  });
  const result = await postcss([plugin]).process('a{color:red;color:red}', {
    from: undefined,
  });
  assert.equal(result.css, 'a{color:red}');
});

test('the merge plugin with mergeRules resolves the browser targets, so an invalid query throws', async () => {
  const plugin = merge({
    enabled: new Set(['mergeRules']),
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
