import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { reduceBorderRadius } from '../src/lib/decl/borderRadiusReducer.js';
import { reduceBorder } from '../src/lib/decl/borderReducer.js';
import { reduceBox } from '../src/lib/decl/boxReducer.js';
import { boxGroups } from '../src/lib/decl/boxGroups.js';
import { BoxSupport } from '../src/lib/targetSupport.js';
import { reduceColumns } from '../src/lib/decl/columns.js';
import {
  reduceBorderRadiusRuns,
  reduceBorderRuns,
  reduceBoxRuns,
  reduceColumnsRuns,
} from './helpers/reduceRuns.js';
import { importanceLanes } from './helpers/importanceLanes.js';
import { applyChildEdits } from '../src/lib/deferredChildEdits.js';

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
    const boxRule = /** @type {import('postcss').Rule} */ (boxRoot.first);
    const boxDecls = /** @type {import('postcss').Declaration[]} */ (
      boxRule.nodes
    );
    reduceBox(
      boxRule,
      {
        group: boxGroups[0],
        decls: boxDecls,
        lanes: [boxDecls, []],
        physical: true,
        flow: null,
      },
      new BoxSupport(['ie 11'])
    );
    applyChildEdits(boxRule);
    assert.strictEqual(boxRoot.toString(), 'a{margin:10px}');

    const radiusRoot = postcss.parse(
      'a{border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px}'
    );
    const radiusRule = /** @type {import('postcss').Rule} */ (radiusRoot.first);
    const radiusDecls = /** @type {import('postcss').Declaration[]} */ (
      radiusRule.nodes
    );
    reduceBorderRadius(radiusRule, radiusDecls, [radiusDecls, []]);
    applyChildEdits(radiusRule);
    assert.strictEqual(radiusRoot.toString(), 'a{border-radius:4px}');

    const columnsRoot = postcss.parse('a{column-width:100px;column-count:2}');
    const colRule = /** @type {import('postcss').Rule} */ (columnsRoot.first);
    const colDecls = /** @type {import('postcss').Declaration[]} */ (
      colRule.nodes
    );
    reduceColumns(colRule, colDecls, [colDecls, []]);
    applyChildEdits(colRule);
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
    reduceBorder(
      borderRule,
      /** @type {import('postcss').Declaration[]} */ (borderRule.nodes),
      true
    );
    applyChildEdits(borderRule);
    assert.strictEqual(
      borderRoot.toString(),
      'a{border:1px solid red;border-width:2px}'
    );

    reduceBorder(
      borderRule,
      /** @type {import('postcss').Declaration[]} */ (borderRule.nodes),
      false
    );
    applyChildEdits(borderRule);
    assert.strictEqual(borderRoot.toString(), 'a{border:2px solid red}');
  });

  test('importanceLanes partitions declarations by importance and preserves all barriers', () => {
    const rootWithAll = postcss.parse(
      'a{margin-top:10px;all:unset;margin-bottom:10px;margin-left:10px !important}'
    );
    const ruleWithAll = /** @type {import('postcss').Rule} */ (
      rootWithAll.first
    );
    const declsWithAll = /** @type {import('postcss').Declaration[]} */ (
      ruleWithAll.nodes
    );
    const [normalLane, importantLane] = importanceLanes(
      ruleWithAll,
      declsWithAll
    );
    assert.deepStrictEqual(
      normalLane.map((d) => d.prop),
      ['margin-top', 'all', 'margin-bottom']
    );
    assert.deepStrictEqual(
      importantLane.map((d) => d.prop),
      ['margin-left']
    );

    const rootNoAll = postcss.parse(
      'a{margin-top:10px;margin-right:10px !important;margin-bottom:10px}'
    );
    const ruleNoAll = /** @type {import('postcss').Rule} */ (rootNoAll.first);
    const declsNoAll = /** @type {import('postcss').Declaration[]} */ (
      ruleNoAll.nodes
    );
    const [normalNoAll, importantNoAll] = importanceLanes(
      ruleNoAll,
      declsNoAll
    );
    assert.deepStrictEqual(
      normalNoAll.map((d) => d.prop),
      ['margin-top', 'margin-bottom']
    );
    assert.deepStrictEqual(
      importantNoAll.map((d) => d.prop),
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
    reduceBorderRadius(rule, [], [[], []]);
    assert.equal(
      rule.toString(),
      'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
    );
  });
});
