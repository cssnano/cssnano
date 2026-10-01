import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { reduceBox } from '../src/lib/decl/boxReducer.js';
import { reduceBorder } from '../src/lib/decl/borderReducer.js';
import { reduceBorderRadius } from '../src/lib/decl/borderRadiusReducer.js';
import { reduceColumns } from '../src/lib/decl/columns.js';
import { importanceLanes } from '../src/lib/decl/importanceLanes.js';

/**
 * @param {string} css one rule
 * @param {(rule: import('postcss').Rule) => void} reduce
 * @return {string}
 */
function reduceRule(css, reduce) {
  const root = postcss.parse(css);
  reduce(/** @type {import('postcss').Rule} */ (root.first));
  return root.toString();
}

// Called without a declaration list, a reducer scans the whole rule. It must
// still treat a nested rule as a boundary, since a shorthand merged across it
// would override the nested rule's declarations.
describe('reducers called without a declaration list', () => {
  test('reduceBox does not merge margin longhands across a nested rule', () => {
    const css =
      'a{margin-top:1px;&{margin-top:2px}margin-right:1px;margin-bottom:1px;margin-left:1px}';
    assert.strictEqual(
      reduceRule(css, (rule) => reduceBox(rule, 'margin')),
      css
    );
  });

  test('reduceBox merges each run of margin longhands separately', () => {
    assert.strictEqual(
      reduceRule(
        'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px;&{x:y}padding:0;margin-top:2px;margin-right:2px;margin-bottom:2px;margin-left:2px}',
        (rule) => reduceBox(rule, 'margin')
      ),
      'a{margin:1px;&{x:y}padding:0;margin:2px}'
    );
  });

  test('reduceBorderRadius does not merge across a nested rule', () => {
    const css =
      'a{border-top-left-radius:1px;&{border-top-left-radius:2px}border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px}';
    assert.strictEqual(reduceRule(css, reduceBorderRadius), css);
  });

  test('reduceColumns does not merge across a nested rule', () => {
    const css = 'a{column-width:1px;&{column-width:2px}column-count:2}';
    assert.strictEqual(reduceRule(css, reduceColumns), css);
  });

  test('reduceBorder does not merge across a nested rule', () => {
    const css =
      'a{border-top-width:1px;&{border-top-width:2px}border-top-style:solid;border-top-color:red}';
    assert.strictEqual(reduceRule(css, reduceBorder), css);
  });
});

describe('importanceLanes', () => {
  test('ignores an all declaration in another run separated by a nested rule', () => {
    const root = postcss.parse('a{all:unset;&{x:y}margin-top:1px}');
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    const margin = /** @type {import('postcss').Declaration} */ (rule.last);
    assert.deepStrictEqual(importanceLanes(rule, [margin]), [[margin], []]);
  });
});
