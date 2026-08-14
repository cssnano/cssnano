'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const resolveBorderGrid = require('../src/lib/decl/borderMatrix.js');

/**
 * containsUnmergeableBorderDecls guards this resolver during plugin execution;
 * this test exercises it directly.
 *
 * @param {string} css
 * @return {string}
 */
function processBorderMatrix(css) {
  const root = postcss.parse(css);

  resolveBorderGrid(/** @type {import('postcss').Rule} */ (root.first));

  return root.toString();
}

test('resolves a matrix the sides specify more briefly', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border:1px dotted currentcolor;border-color:#aabbcc currentcolor red}'
    ),
    'a{border:1px dotted;border-top-color:#aabbcc;border-bottom-color:red}'
  );
});

/* Resolving the border matrix may split declarations into separate forms, each
 * carrying the `!important` flag from the original. Size comparisons must
 * factor in this multiplication of the flag cost. */

test('leaves an important matrix alone when its resolved form is longer', () => {
  const css =
    'a{border:1px dotted currentcolor!important;border-color:#aabbcc currentcolor red!important}';

  assert.strictEqual(processBorderMatrix(css), css);
});

test('resolves an important matrix that is still shorter once !important counts', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border:medium none currentcolor!important;border-left-color:#ddeeff!important;border-top-width:2px!important}'
    ),
    'a{border:none!important;border-top:2px!important;border-left:#ddeeff!important}'
  );
});
