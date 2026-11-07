import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';

const plugin = transformPlugin('mergeRules');

test('a merged rule keeps the order of shared declarations that are not adjacent in the earlier rule', async () => {
  // `margin` stands between the shared `color` and `width` in `a`, so the
  // shared declarations are not adjacent there; the merged rule keeps their
  // order from `a`.
  const { css } = await postcss([plugin]).process(
    'a{color:red;margin:0;width:1px}b{color:red;width:1px}',
    { from: undefined }
  );
  assert.equal(css, 'a{margin:0}a,b{color:red;width:1px}');
});
