import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { reduceBorder } from '../src/lib/decl/borderReducer.js';

/**
 * containsUnmergeableBorderDecls guards this resolver during plugin execution;
 * this test exercises it directly.
 *
 * @param {string} css
 * @return {string}
 */
function processBorderMatrix(css) {
  const root = postcss.parse(css);

  reduceBorder(/** @type {import('postcss').Rule} */ (root.first));

  return root.toString();
}

test('resolves a matrix the sides specify more briefly', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border:1px dotted currentcolor;border-color:#aabbcc currentcolor red}'
    ),
    'a{border:1px dotted;border-color:#aabbcc currentcolor red}'
  );
});

/* Resolving the border matrix may split declarations into separate forms, each
 * carrying the `!important` flag from the original. Size comparisons must
 * factor in this multiplication of the flag cost. */

test('leaves an important matrix alone when its resolved form is longer', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border:1px dotted currentcolor!important;border-color:#aabbcc currentcolor red!important}'
    ),
    'a{border:1px dotted!important;border-color:#aabbcc currentcolor red!important}'
  );
});

test('resolves an important matrix that is still shorter once !important counts', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border:medium none currentcolor!important;border-left-color:#ddeeff!important;border-top-width:2px!important}'
    ),
    'a{border:none!important;border-top:2px!important;border-left:#ddeeff!important}'
  );
});

test('refuses no-growth decisions where candidate is not shorter', () => {
  assert.strictEqual(
    processBorderMatrix('a{border-top-width:1px;border-top-style:solid}'),
    'a{border-top-width:1px;border-top-style:solid}'
  );
});

test('does not cross importance lanes for partial groups', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border-top-width:1px;border-top-style:solid!important;border-top-color:red}'
    ),
    'a{border-top-width:1px;border-top-style:solid!important;border-top-color:red}'
  );
});

test('preserves invalid border declarations', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border-top-width:-1px;border-top-style:solid;border-top-color:red}'
    ),
    'a{border-top-width:-1px;border-top-style:solid;border-top-color:red}'
  );
});

test('preserves CSS-wide keywords in longhands', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border-top-width:inherit;border-top-style:solid;border-top-color:red}'
    ),
    'a{border-top-width:inherit;border-top-style:solid;border-top-color:red}'
  );
});

test('treats style hacks as barriers and preserves authored declaration', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border-top-width:1px\\9;border-top-width:1px;border-top-style:solid;border-top-color:red}'
    ),
    'a{border-top-width:1px\\9;border-top:1px solid red}'
  );
});

test('preserves unresolved custom properties', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border-top-width:var(--w);border-top-style:solid;border-top-color:red}'
    ),
    'a{border-top-width:var(--w);border-top-style:solid;border-top-color:red}'
  );
});

test('preserves support-dependent fallback declarations', () => {
  assert.strictEqual(
    processBorderMatrix('a{border-color:#ddd;border-color:rgba(0,0,0,.15)}'),
    'a{border-color:#ddd;border-color:rgba(0,0,0,.15)}'
  );
});

test('preserves an env barrier when reducing the other border cells', () => {
  assert.strictEqual(
    processBorderMatrix(
      'a{border-top:1px dashed currentcolor;border-top-width:1px;border-top-style:env(safe-area-inset-top);border-bottom:thin solid currentcolor}'
    ),
    'a{border-top:1px dashed currentcolor;border-top-width:1px;border-top-style:env(safe-area-inset-top);border-bottom:thin solid}'
  );
});
