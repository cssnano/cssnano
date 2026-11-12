import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { createRunContext } = await import('../../src/passes/ir/runContext.js');
const { default: postcss } = await import('postcss');
const { TextTable } = await import('../../src/values/textTable.js');
const { tokens } = await import('../../src/utils/value.js');
const { reduceBorderRadius } =
  await import('../../src/passes/merge/lib/longhand/decl/borderRadiusReducer.js');
const { partitionLanes } =
  await import('../../src/passes/merge/lib/longhand/decl/radiusDescriptors.js');
const { longstandingFeatures } =
  await import('../../src/passes/merge/lib/longhand/syntaxFeatures.js');
const { declarationsFromNodes } =
  await import('../../src/passes/merge/lib/longhand/nodeDeclarations.js');
const { reduceBlock } =
  await import('../passes/merge/lib/longhand/helpers/declarationItems.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

/**
 * The normal and important lanes of the positions of a block.
 *
 * @param {import('../../src/passes/merge/lib/longhand/blockDeclarations.js').BlockDeclarations} list
 * @param {number[]} positions
 * @return {[number[], number[]]}
 */
const lanesOf = (list, positions) => [
  positions.filter((p) => !list.at(p).important),
  positions.filter((p) => list.at(p).important),
];

suite(
  'the border-radius reader reads the text the border-radius writer wrote',
  () => {
    test('radiusDescriptors reads the text borderRadiusReducer wrote, without tokenizing', () => {
      const root = postcss.parse('a { border-radius: 1px 1px }');
      const table = new TextTable();
      const block = declarationsFromNodes(root.first, createRunContext(table));
      const positions = [0];
      reduceBorderRadius(
        block.list,
        positions,
        [positions, []],
        longstandingFeatures
      );
      assert.equal(block.list.at(0).value, '1px');
      const before = tokenizeTotal();
      partitionLanes(block.list, [positions, []]);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test("borderRadiusReducer's edited tokens spell text()", () => {
      const root = postcss.parse(
        'a { border-radius: 1px 2px 1px 2px / 3px 4px }'
      );
      const table = new TextTable();
      reduceBlock(root.first, table, (list, positions) =>
        reduceBorderRadius(
          list,
          positions,
          [positions, []],
          longstandingFeatures
        )
      );
      const decl = root.first.first;
      assert.deepEqual(
        table.stored(decl)?.map((token) => token.slice(0, 4)),
        tokens(decl.value).map((token) => token.slice(0, 4))
      );
    });

    test("borderRadiusReducer's edited corner tokens spell text()", () => {
      const root = postcss.parse('a { border-top-left-radius: 1px 1px }');
      const table = new TextTable();
      reduceBlock(root.first, table, (list, positions) =>
        reduceBorderRadius(
          list,
          positions,
          [positions, []],
          longstandingFeatures
        )
      );
      const decl = root.first.first;
      assert.deepEqual(
        table.stored(decl)?.map((token) => token.slice(0, 4)),
        tokens(decl.value).map((token) => token.slice(0, 4))
      );
    });

    test("borderRadiusReducer's rewritten shorthand tokens spell text()", () => {
      const root = postcss.parse(
        'a { border-radius: 1px 2px 1px 2px / 3px 4px; border-top-left-radius: 5px !important }'
      );
      const table = new TextTable();
      reduceBlock(root.first, table, (list, positions) =>
        reduceBorderRadius(
          list,
          positions,
          lanesOf(list, positions),
          longstandingFeatures
        )
      );
      const decl = root.first.first;
      assert.deepEqual(
        table.stored(decl)?.map((token) => token.slice(0, 4)),
        tokens(decl.value).map((token) => token.slice(0, 4))
      );
    });

    test("borderRadiusReducer's merged tokens spell text()", () => {
      const root = postcss.parse(
        'a { border-top-left-radius: 1px; border-top-right-radius: 2px; border-bottom-right-radius: 1px; border-bottom-left-radius: 2px }'
      );
      const table = new TextTable();
      reduceBlock(root.first, table, (list, positions) =>
        reduceBorderRadius(
          list,
          positions,
          [positions, []],
          longstandingFeatures
        )
      );
      const merged = root.first.nodes.find(
        (node) => node.prop === 'border-radius'
      );
      assert.deepEqual(
        table.stored(merged)?.map((token) => token.slice(0, 4)),
        tokens(merged.value).map((token) => token.slice(0, 4))
      );
    });
  }
);
