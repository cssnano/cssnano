import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { reduceBorderRadius } from '../../../../../src/passes/merge/lib/longhand/decl/borderRadiusReducer.js';
import { reduceBorder } from '../../../../../src/passes/merge/lib/longhand/decl/borderReducer.js';
import { reduceBox } from '../../../../../src/passes/merge/lib/longhand/decl/boxReducer.js';
import { boxGroups } from '../../../../../src/passes/merge/lib/longhand/decl/boxGroups.js';
import { BoxSupport } from '../../../../../src/passes/merge/lib/longhand/targetSupport.js';
import { reduceColumns } from '../../../../../src/passes/merge/lib/longhand/decl/columns.js';
import {
  reduceBlockOf,
  reduceBorderRadiusRuns,
  reduceBorderRuns,
  reduceBoxRuns,
  reduceColumnsRuns,
} from './helpers/reduceRuns.js';
import { importanceLanes } from './helpers/importanceLanes.js';
import { blockOf } from './helpers/declarationItems.js';
import { longstandingFeatures } from '../../../../../src/passes/merge/lib/longhand/syntaxFeatures.js';

describe('mixed-family internal reducers and helpers', () => {
  test('reduces each family from a whole rule', () => {
    const boxRoot = postcss.parse(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}'
    );
    reduceBoxRuns(
      /** @type {import('postcss').Rule} */ (boxRoot.first),
      'margin'
    );
    assert.strictEqual(boxRoot.toString(), 'a{margin:10px}');

    const borderRoot = postcss.parse(
      'a{border:1px solid red;border-width:2px}'
    );
    reduceBorderRuns(/** @type {import('postcss').Rule} */ (borderRoot.first));
    assert.strictEqual(borderRoot.toString(), 'a{border:2px solid red}');

    const radiusRoot = postcss.parse(
      'a{border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px}'
    );
    reduceBorderRadiusRuns(
      /** @type {import('postcss').Rule} */ (radiusRoot.first)
    );
    assert.strictEqual(radiusRoot.toString(), 'a{border-radius:4px}');

    const columnsRoot = postcss.parse('a{column-width:100px;column-count:2}');
    reduceColumnsRuns(
      /** @type {import('postcss').Rule} */ (columnsRoot.first)
    );
    assert.strictEqual(columnsRoot.toString(), 'a{columns:100px 2}');
  });

  test('supports direct internal helper invocations with pre-computed lanes', () => {
    const boxRoot = postcss.parse(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}'
    );
    reduceBlockOf(
      /** @type {import('postcss').Rule} */ (boxRoot.first),
      (list) =>
        reduceBox(
          list,
          {
            group: boxGroups[0],
            decls: [0, 1, 2, 3],
            lanes: [[0, 1, 2, 3], []],
            physical: true,
            flow: null,
          },
          new BoxSupport(['ie 11']),
          longstandingFeatures
        )
    );
    assert.strictEqual(boxRoot.toString(), 'a{margin:10px}');

    const radiusRoot = postcss.parse(
      'a{border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px}'
    );
    reduceBlockOf(
      /** @type {import('postcss').Rule} */ (radiusRoot.first),
      (list) =>
        reduceBorderRadius(
          list,
          [0, 1, 2, 3],
          [[0, 1, 2, 3], []],
          longstandingFeatures
        )
    );
    assert.strictEqual(radiusRoot.toString(), 'a{border-radius:4px}');

    const columnsRoot = postcss.parse('a{column-width:100px;column-count:2}');
    reduceBlockOf(
      /** @type {import('postcss').Rule} */ (columnsRoot.first),
      (list) => reduceColumns(list, [0, 1], [[0, 1], []], longstandingFeatures)
    );
    assert.strictEqual(columnsRoot.toString(), 'a{columns:100px 2}');
  });

  test('supports direct internal helper invocations with unrelated declarations in the rule', () => {
    const mixedColRoot = postcss.parse(
      'a{color:red;column-width:100px;column-count:2}'
    );
    const mixedColRule = /** @type {import('postcss').Rule} */ (
      mixedColRoot.first
    );
    reduceColumnsRuns(mixedColRule);
    assert.strictEqual(mixedColRoot.toString(), 'a{color:red;columns:100px 2}');

    const mixedBoxRoot = postcss.parse(
      'a{color:red;margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}'
    );
    const mixedBoxRule = /** @type {import('postcss').Rule} */ (
      mixedBoxRoot.first
    );
    reduceBoxRuns(mixedBoxRule, 'margin');
    assert.strictEqual(mixedBoxRoot.toString(), 'a{color:red;margin:10px}');

    const interleavedBoxRoot = postcss.parse(
      'a{margin-top:10px;margin-right:10px;margin-inline-end:20px;margin-bottom:10px;margin-left:10px}'
    );
    const interleavedBoxRule = /** @type {import('postcss').Rule} */ (
      interleavedBoxRoot.first
    );
    reduceBoxRuns(interleavedBoxRule, 'margin');
    assert.strictEqual(
      interleavedBoxRoot.toString(),
      'a{margin-top:10px;margin-right:10px;margin-inline-end:20px;margin-bottom:10px;margin-left:10px}'
    );
  });

  test('reduceBorder short-circuits without modifying when hasForeignBorder is true', () => {
    const borderRoot = postcss.parse(
      'a{border:1px solid red;border-width:2px}'
    );
    const borderRule = /** @type {import('postcss').Rule} */ (borderRoot.first);
    reduceBlockOf(borderRule, (list) =>
      reduceBorder(list, [0, 1], true, longstandingFeatures)
    );
    assert.strictEqual(
      borderRoot.toString(),
      'a{border:1px solid red;border-width:2px}'
    );

    reduceBlockOf(borderRule, (list) =>
      reduceBorder(list, [0, 1], false, longstandingFeatures)
    );
    assert.strictEqual(borderRoot.toString(), 'a{border:2px solid red}');
  });

  test('importanceLanes partitions declarations by importance and preserves all barriers', () => {
    const withAll = blockOf(
      'a{margin-top:10px;all:unset;margin-bottom:10px;margin-left:10px !important}'
    );
    const [normalLane, importantLane] = importanceLanes(withAll, [0, 1, 2, 3]);
    assert.deepStrictEqual(
      normalLane.map((p) => withAll.at(p).prop),
      ['margin-top', 'all', 'margin-bottom']
    );
    assert.deepStrictEqual(
      importantLane.map((p) => withAll.at(p).prop),
      ['margin-left']
    );

    const noAll = blockOf(
      'a{margin-top:10px;margin-right:10px !important;margin-bottom:10px}'
    );
    const [normalNoAll, importantNoAll] = importanceLanes(noAll, [0, 1, 2]);
    assert.deepStrictEqual(
      normalNoAll.map((p) => noAll.at(p).prop),
      ['margin-top', 'margin-bottom']
    );
    assert.deepStrictEqual(
      importantNoAll.map((p) => noAll.at(p).prop),
      ['margin-right']
    );
  });
});

describe('reduceBorderRadius direct contract', () => {
  test('should reduce border-radius when called on a whole rule', () => {
    const root = postcss.parse(
      'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
    );
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    reduceBorderRadiusRuns(rule);
    assert.equal(rule.toString(), 'a{border-radius:10px}');
  });
  test('should reject rule with logical corner property when called on a whole rule', () => {
    const root = postcss.parse(
      'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px;border-start-start-radius:20px}'
    );
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    reduceBorderRadiusRuns(rule);
    assert.equal(
      rule.toString(),
      'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px;border-start-start-radius:20px}'
    );
  });
  test('should safely no-op on empty rules or rules with comments only', () => {
    const root = postcss.parse('a{/* comment */}');
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    reduceBorderRadiusRuns(rule);
    assert.equal(rule.toString(), 'a{/* comment */}');
  });

  test('should safely no-op when empty declarations array is passed', () => {
    const root = postcss.parse(
      'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
    );
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    reduceBlockOf(rule, (list) =>
      reduceBorderRadius(list, [], [[], []], longstandingFeatures)
    );
    assert.equal(
      rule.toString(),
      'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
    );
  });
});
