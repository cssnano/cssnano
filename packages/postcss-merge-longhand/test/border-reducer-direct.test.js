import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { reduceBorder } from '../src/lib/decl/borderReducer.js';

/**
 * Tests `reduceBorder()` merge correctness directly, without `index.js`'s
 * size guard. Unlike the plugin-level `borders-*.js` tests, these assert the
 * merge result—even if a wrong answer is shorter.
 *
 * @param {string} css one rule
 * @return {string}
 */
function mergeBorders(css) {
  const root = postcss.parse(css);
  const rule = /** @type {import('postcss').Rule} */ (root.first);

  reduceBorder(rule);

  return root.toString();
}

describe('side shorthand merge positioning', () => {
  test('keeps the side a longhand belongs to when merging into border-color', () => {
    assert.strictEqual(
      mergeBorders(
        'a{border:1px solid red;border-left:solid;border-color:currentcolor}'
      ),
      'a{border:1px solid;border-left:solid}'
    );
  });

  test('does not move a side shorthand past a component shorthand that overrode it', () => {
    assert.strictEqual(
      mergeBorders(
        'a{border:medium none #fff;border-left:thick;border:solid #abc123;border-width:1px medium 1px 0;border-left:1px}'
      ),
      'a{border:1px solid #abc123;border-right-width:medium;border-left:1px}'
    );
  });
});

/* border-top and border-color cross: both affect the same CSS values
 * (top-color), creating an order-dependent conflict the property names
 * don't reveal. Segment cell tracking and candidate footprint checking
 * detect this. A merge takes the source position of its last member,
 * so a crossing property blocks it only if positioned after that member. */

describe('crossing property merge blocking', () => {
  test('refuses a merge that would move a side shorthand past a crossing one', () => {
    assert.strictEqual(
      mergeBorders(
        'a{border-top:1px solid red;border-right:1px solid red;border-color:blue;border-bottom:1px solid red;border-left:1px solid red}'
      ),
      'a{border-color:blue blue red red;border-style:solid;border-width:1px}'
    );
  });

  test('allows a merge whose crossing shorthand already comes first', () => {
    assert.strictEqual(
      mergeBorders(
        'a{border-color:blue;border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}'
      ),
      'a{border-color:red;border-style:solid;border-width:1px}'
    );
  });
});

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
