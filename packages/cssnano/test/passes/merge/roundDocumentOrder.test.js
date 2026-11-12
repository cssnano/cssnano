// Guards for the longhand rounds' block set: each round reduces every block
// that holds a declaration, in document order, including blocks inside
// at-rules and rules that rule merging creates. These pass before and after
// the rounds walk the tree, so they pin the output rather than the walk.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import cssnano from '../../../src/index.js';
import { mergePass } from '../../../src/passes/merge/index.js';

const browsers = ['chrome 120', 'firefox 120', 'safari 17'];

/**
 * @param {string} css
 * @return {Promise<string>} the output of the default preset
 */
async function minified(css) {
  const result = await postcss([cssnano()]).process(css, { from: undefined });
  return result.css;
}

const fourMargins =
  'margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px';

test('the first round reduces a block inside @media', async () => {
  assert.equal(
    await minified(`@media (x){a{${fourMargins}}}`),
    '@media(x){a{margin:1px}}'
  );
});

test('the first round reduces a block inside @supports', async () => {
  assert.equal(
    await minified(`@supports (display:grid){a{${fourMargins}}}`),
    '@supports(display:grid){a{margin:1px}}'
  );
});

test('the first round reduces a block inside an at-rule the host walk does not know', async () => {
  assert.equal(
    await minified(`@foo x{a{${fourMargins}}}`),
    '@foo x{a{margin:1px}}'
  );
});

test('the first round reduces a block inside @page, which holds declarations of its own', async () => {
  assert.equal(await minified(`@page{${fourMargins}}`), '@page{margin:1px}');
});

test('the rounds reduce a rule nested in a block after the block itself', async () => {
  assert.equal(
    await minified(`@media (x){a{${fourMargins}}a{margin-top:2px}}`),
    '@media(x){a{margin:2px 1px 1px}}'
  );
});

test('the second round reduces a rule that rule merging created inside an at-rule', async () => {
  assert.equal(
    await minified(
      '@media (a){.x{margin-right:1px;margin-left:1px}}@media (a){.y{margin-left:1px}}@media (a){.x{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}}'
    ),
    '@media(a){.x,.y{margin-left:1px}.x{margin:1px}}'
  );
});

test('mergePass alone reduces a block inside @media the same as the preset does', () => {
  const root = postcss.parse(`@media (x){a{${fourMargins}}}`);
  mergePass(root, browsers);
  assert.equal(root.toString(), '@media (x){a{margin:1px}}');
});
