import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import isAnonymousLayer from '../../src/utils/isAnonymousLayer.js';
import { TextTable } from '../../src/values/textTable.js';

/**
 * @param {string} css
 * @return {import('postcss').AtRule}
 */
function parseAtRule(css) {
  return /** @type {import('postcss').AtRule} */ (postcss.parse(css).first);
}

test('isAnonymousLayer should accept a layer block with empty params', () => {
  assert.strictEqual(
    isAnonymousLayer(parseAtRule('@layer{}'), new TextTable()),
    true
  );
});

test('isAnonymousLayer should accept a layer block with whitespace-only params', () => {
  assert.strictEqual(
    isAnonymousLayer(parseAtRule('@layer   {}'), new TextTable()),
    true
  );
});

// postcss strips comments next to whitespace from parsed params, so these
// nodes are built directly to keep the comment in `params`.
test('isAnonymousLayer should accept a layer block whose params are only a comment', () => {
  const node = postcss.atRule({ name: 'layer', params: '/* x */' });
  assert.strictEqual(isAnonymousLayer(node, new TextTable()), true);
});

test('isAnonymousLayer should reject a layer block with a name', () => {
  assert.strictEqual(
    isAnonymousLayer(parseAtRule('@layer base{}'), new TextTable()),
    false
  );
});

test('isAnonymousLayer should reject a layer block with a comment and a name', () => {
  const node = postcss.atRule({ name: 'layer', params: '/* x */ base' });
  assert.strictEqual(isAnonymousLayer(node, new TextTable()), false);
});
