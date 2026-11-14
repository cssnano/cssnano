import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { createRunContext } = await import('../../src/passes/ir/runContext.js');
const { default: postcss } = await import('postcss');
const { reduceBorderRadius } =
  await import('../../src/passes/merge/lib/longhand/decl/borderRadiusReducer.js');
const { partitionLanes } =
  await import('../../src/passes/merge/lib/longhand/decl/radiusDescriptors.js');
const { longstandingFeatures } =
  await import('../../src/passes/ir/syntaxFeatures.js');
const { readBlock } =
  await import('../passes/merge/lib/longhand/helpers/declarationItems.js');
const { reduceBlock, itemTokensSpellText } =
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
      const block = readBlock(root.first, createRunContext());
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
      const reduced = reduceBlock(root.first, (list, positions) =>
        reduceBorderRadius(
          list,
          positions,
          [positions, []],
          longstandingFeatures
        )
      );
      assert.ok(itemTokensSpellText(reduced));
    });

    test("borderRadiusReducer's edited corner tokens spell text()", () => {
      const root = postcss.parse('a { border-top-left-radius: 1px 1px }');
      const reduced = reduceBlock(root.first, (list, positions) =>
        reduceBorderRadius(
          list,
          positions,
          [positions, []],
          longstandingFeatures
        )
      );
      assert.ok(itemTokensSpellText(reduced));
    });

    test("borderRadiusReducer's rewritten shorthand tokens spell text()", () => {
      const root = postcss.parse(
        'a { border-radius: 1px 2px 1px 2px / 3px 4px; border-top-left-radius: 5px !important }'
      );
      const reduced = reduceBlock(root.first, (list, positions) =>
        reduceBorderRadius(
          list,
          positions,
          lanesOf(list, positions),
          longstandingFeatures
        )
      );
      assert.ok(itemTokensSpellText(reduced));
    });

    test("borderRadiusReducer's merged tokens spell text()", () => {
      const root = postcss.parse(
        'a { border-top-left-radius: 1px; border-top-right-radius: 2px; border-bottom-right-radius: 1px; border-bottom-left-radius: 2px }'
      );
      const reduced = reduceBlock(root.first, (list, positions) =>
        reduceBorderRadius(
          list,
          positions,
          [positions, []],
          longstandingFeatures
        )
      );
      assert.ok(itemTokensSpellText(reduced));
    });
  }
);
