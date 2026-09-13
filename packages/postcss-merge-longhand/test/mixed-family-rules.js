import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { reduceBox } from '../src/lib/decl/boxReducer.js';
import { reduceBorder } from '../src/lib/decl/borderReducer.js';
import { reduceBorderRadius } from '../src/lib/decl/borderRadiusReducer.js';
import { reduceColumns } from '../src/lib/decl/columns.js';
import { importanceLanes } from '../src/lib/decl/importanceLanes.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

suite('mixed-family rules', () => {
  test(
    'reduces all six supported families in a single rule including border-spacing',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px;border:1px solid red;border-width:2px;border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px;border-spacing:10px 10px;column-width:100px;column-count:2}',
      'a{margin:10px;padding:5px;border:2px solid red;border-radius:4px;border-spacing:10px;columns:100px 2}'
    )
  );

  test(
    'multi-family all reset isolates transforms across all active families including columns and radius',
    passthroughCSS(
      'a{margin-top:10px;margin-bottom:10px;padding-top:5px;padding-bottom:5px;border-top-left-radius:4px;border-bottom-right-radius:4px;column-width:100px;all:unset;margin-top:20px;margin-bottom:20px;padding-top:10px;padding-bottom:10px;border-top-left-radius:8px;border-bottom-right-radius:8px;column-count:2}'
    )
  );

  test(
    'foreign border property blocks border reduction while other families merge',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;border-image:none;border:1px solid red;border-width:2px;column-width:100px;column-count:2}',
      'a{margin:10px;border-image:none;border:1px solid red;border-width:2px;columns:100px 2}'
    )
  );

  test(
    'preserves lane isolation and cleans up overridden columns with mixed importance across all boundary',
    processCSS(
      'a{column-width:100px !important;column-count:2;all:unset !important;column-width:200px !important;columns:initial !important}',
      'a{column-width:100px !important;column-count:2;all:unset !important;columns:initial !important}'
    )
  );

  test(
    'border-radius handles all barrier and importance lanes properly',
    processCSS(
      'a{border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px;all:unset;border-top-left-radius:8px !important;border-top-right-radius:8px !important;border-bottom-right-radius:8px !important;border-bottom-left-radius:8px !important}',
      'a{border-radius:4px;all:unset;border-radius:8px !important}'
    )
  );

  test(
    'preserves comments between declarations across multiple families',
    processCSS(
      'a{/*c1*/margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;/*c2*/padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px}',
      'a{/*c1*/margin:10px;/*c2*/padding:5px}'
    )
  );

  test(
    'preserves margin-inline and margin-block when physical margins merge',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;margin-inline:20px;margin-block:30px}',
      'a{margin:10px;margin-inline:20px;margin-block:30px}'
    )
  );

  test(
    'preserves interleaved margin-inline-start with physical margins',
    processCSS(
      'a{margin-inline-start:5px;margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}',
      'a{margin-inline-start:5px;margin:10px}'
    )
  );

  test(
    'preserves padding-inline and padding-block when physical paddings merge',
    processCSS(
      'a{padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px;padding-inline:15px;padding-block:25px}',
      'a{padding:5px;padding-inline:15px;padding-block:25px}'
    )
  );

  test(
    'merges one family before all barrier while another family merges after it',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;padding-top:2px;all:unset;padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px}',
      'a{margin:10px;padding-top:2px;all:unset;padding:5px}'
    )
  );

  test(
    'handles multiple all barriers across declarations',
    processCSS(
      'a{margin-top:10px;all:unset;margin-top:20px;margin-right:20px;margin-bottom:20px;margin-left:20px;all:initial;margin-top:30px}',
      'a{margin-top:10px;all:unset;margin:20px;all:initial;margin-top:30px}'
    )
  );

  test(
    'handles pure all declaration rule without error',
    passthroughCSS('a{all:unset}')
  );

  test(
    'preserves malformed border-radius declarations without crashing under pre-computed lanes',
    passthroughCSS('a{border-radius:10px / / 20px;border-top-left-radius:5px}')
  );

  test(
    'preserves malformed margin declarations without crashing under pre-computed lanes',
    passthroughCSS(
      'a{margin-top:10px;margin-right:10foo;margin-bottom:10px;margin-left:10px}'
    )
  );

  test('supports direct internal helper invocations without pre-computed lanes', () => {
    const boxRoot = postcss.parse(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}'
    );
    reduceBox(/** @type {import('postcss').Rule} */ (boxRoot.first), 'margin');
    assert.strictEqual(boxRoot.toString(), 'a{margin:10px}');

    const borderRoot = postcss.parse(
      'a{border:1px solid red;border-width:2px}'
    );
    reduceBorder(/** @type {import('postcss').Rule} */ (borderRoot.first));
    assert.strictEqual(borderRoot.toString(), 'a{border:2px solid red}');

    const radiusRoot = postcss.parse(
      'a{border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px}'
    );
    reduceBorderRadius(
      /** @type {import('postcss').Rule} */ (radiusRoot.first)
    );
    assert.strictEqual(radiusRoot.toString(), 'a{border-radius:4px}');

    const columnsRoot = postcss.parse('a{column-width:100px;column-count:2}');
    reduceColumns(/** @type {import('postcss').Rule} */ (columnsRoot.first));
    assert.strictEqual(columnsRoot.toString(), 'a{columns:100px 2}');
  });

  test('supports direct internal helper invocations with declarations array', () => {
    const boxRoot = postcss.parse(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}'
    );
    const boxRule = /** @type {import('postcss').Rule} */ (boxRoot.first);
    reduceBox(
      boxRule,
      'margin',
      /** @type {import('postcss').Declaration[]} */ (boxRule.nodes)
    );
    assert.strictEqual(boxRoot.toString(), 'a{margin:10px}');

    const borderRoot = postcss.parse(
      'a{border:1px solid red;border-width:2px}'
    );
    const borderRule = /** @type {import('postcss').Rule} */ (borderRoot.first);
    reduceBorder(
      borderRule,
      /** @type {import('postcss').Declaration[]} */ (borderRule.nodes)
    );
    assert.strictEqual(borderRoot.toString(), 'a{border:2px solid red}');

    const radiusRoot = postcss.parse(
      'a{border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px}'
    );
    const radiusRule = /** @type {import('postcss').Rule} */ (radiusRoot.first);
    reduceBorderRadius(
      radiusRule,
      /** @type {import('postcss').Declaration[]} */ (radiusRule.nodes)
    );
    assert.strictEqual(radiusRoot.toString(), 'a{border-radius:4px}');

    const columnsRoot = postcss.parse('a{column-width:100px;column-count:2}');
    const colRule = /** @type {import('postcss').Rule} */ (columnsRoot.first);
    reduceColumns(
      colRule,
      /** @type {import('postcss').Declaration[]} */ (colRule.nodes)
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
    reduceBox(boxRule, 'margin', boxDecls, [boxDecls, []]);
    assert.strictEqual(boxRoot.toString(), 'a{margin:10px}');

    const radiusRoot = postcss.parse(
      'a{border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px}'
    );
    const radiusRule = /** @type {import('postcss').Rule} */ (radiusRoot.first);
    const radiusDecls = /** @type {import('postcss').Declaration[]} */ (
      radiusRule.nodes
    );
    reduceBorderRadius(radiusRule, radiusDecls, [radiusDecls, []]);
    assert.strictEqual(radiusRoot.toString(), 'a{border-radius:4px}');

    const columnsRoot = postcss.parse('a{column-width:100px;column-count:2}');
    const colRule = /** @type {import('postcss').Rule} */ (columnsRoot.first);
    const colDecls = /** @type {import('postcss').Declaration[]} */ (
      colRule.nodes
    );
    reduceColumns(colRule, colDecls, [colDecls, []]);
    assert.strictEqual(columnsRoot.toString(), 'a{columns:100px 2}');
  });

  test(
    'does not merge physical margins across an interleaved flow-relative margin declaration',
    passthroughCSS(
      'a{margin-top:10px;margin-right:10px;margin-inline-end:20px;margin-bottom:10px;margin-left:10px}'
    )
  );

  test(
    'does not merge physical margin shorthand with trailing physical longhand across flow-relative margin',
    passthroughCSS('a{margin:10px;margin-inline:20px;margin-left:5px}')
  );

  test(
    'merges independent physical margin segments before and after flow-relative margin',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;margin-inline:20px;margin-top:30px;margin-right:30px;margin-bottom:30px;margin-left:30px}',
      'a{margin-inline:20px;margin:30px}'
    )
  );

  test(
    'does not merge physical paddings across an interleaved flow-relative padding declaration',
    passthroughCSS(
      'a{padding-top:10px;padding-right:10px;padding-inline-end:20px;padding-bottom:10px;padding-left:10px}'
    )
  );

  test(
    'does not merge physical padding shorthand with trailing physical longhand across flow-relative padding',
    passthroughCSS('a{padding:10px;padding-inline:20px;padding-left:5px}')
  );

  test(
    'merges independent physical padding segments before and after flow-relative padding',
    processCSS(
      'a{padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px;padding-inline:20px;padding-top:30px;padding-right:30px;padding-bottom:30px;padding-left:30px}',
      'a{padding-inline:20px;padding:30px}'
    )
  );

  test(
    'cleans up earlier column longhand overridden by shorthand in the same lane',
    processCSS('a{column-width:100px;columns:200px}', 'a{columns:200px}')
  );

  test(
    'cleans up earlier column longhand when following longhands merge into shorthand',
    processCSS(
      'a{column-width:50px;column-width:100px;column-count:2}',
      'a{columns:100px 2}'
    )
  );

  test(
    'flow-relative border property blocks physical border reduction while other families merge',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;border-inline:1px solid red;border:1px solid red;border-width:2px;column-width:100px;column-count:2}',
      'a{margin:10px;border-inline:1px solid red;border:1px solid red;border-width:2px;columns:100px 2}'
    )
  );

  test(
    'preserves logical border-radius without merging physical border-radius',
    passthroughCSS(
      'a{border-start-start-radius:8px;border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px}'
    )
  );

  test(
    'allows important lane physical margins to merge when all declaration is normal importance',
    processCSS(
      'a{margin-top:10px !important;all:unset;margin-right:10px !important;margin-bottom:10px !important;margin-left:10px !important}',
      'a{all:unset;margin:10px !important}'
    )
  );

  test('supports direct internal helper invocations with mixed declarations array', () => {
    const mixedColRoot = postcss.parse(
      'a{color:red;column-width:100px;column-count:2}'
    );
    const mixedColRule = /** @type {import('postcss').Rule} */ (
      mixedColRoot.first
    );
    reduceColumns(
      mixedColRule,
      /** @type {import('postcss').Declaration[]} */ (mixedColRule.nodes)
    );
    assert.strictEqual(mixedColRoot.toString(), 'a{color:red;columns:100px 2}');

    const mixedBoxRoot = postcss.parse(
      'a{color:red;margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}'
    );
    const mixedBoxRule = /** @type {import('postcss').Rule} */ (
      mixedBoxRoot.first
    );
    reduceBox(
      mixedBoxRule,
      'margin',
      /** @type {import('postcss').Declaration[]} */ (mixedBoxRule.nodes)
    );
    assert.strictEqual(mixedBoxRoot.toString(), 'a{color:red;margin:10px}');

    const interleavedBoxRoot = postcss.parse(
      'a{margin-top:10px;margin-right:10px;margin-inline-end:20px;margin-bottom:10px;margin-left:10px}'
    );
    const interleavedBoxRule = /** @type {import('postcss').Rule} */ (
      interleavedBoxRoot.first
    );
    reduceBox(interleavedBoxRule, 'margin');
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
    assert.strictEqual(
      borderRoot.toString(),
      'a{border:1px solid red;border-width:2px}'
    );

    reduceBorder(
      borderRule,
      /** @type {import('postcss').Declaration[]} */ (borderRule.nodes),
      false
    );
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
