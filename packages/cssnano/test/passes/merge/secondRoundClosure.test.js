// Pins the second round's closure: after the merge pass, canonicalizing any
// block of the output changes nothing, so a block the second round skipped
// must already be canonical.
//
// Known gap: the mutants that drop the report of the receiving block, the
// second clone and a leftover survive. Over the oracle families and about
// 20,000 biased sheets, no shape made those created blocks non-canonical, so
// the per-report driver cases in driver.test.js are the authoritative check
// for those sites.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { mergePass } from '../../../src/passes/merge/index.js';
import {
  canonicalize,
  finishColumns,
  longhandContext,
} from '../../../src/passes/merge/lib/longhand/canonicalize.js';
import { TextTable } from '../../../src/values/textTable.js';
import { withTargetSupport } from '../../../src/passes/merge/lib/longhand/isFallback.js';
import { clearSupportCache } from '../../../src/passes/merge/lib/longhand/syntaxFeatures.js';
import { targetSupportOf } from '../../../src/passes/merge/lib/longhand/targetSupport.js';
import { resolveTargets } from '../../../src/utils/browserTargets.js';
import {
  generateFamilyCases,
  generateResetCases,
} from '../../../script/passes/merge/rules/lib/mergeOracle.js';

const browsers = resolveTargets({}, undefined);

// Each run of the merge pass: with rule merging, and with it off. Round one
// alone is not closed, which is why the second round exists, so it has no row.
const rows = [
  ['rules', { rules: true }],
  ['rules off', { rules: false }],
];

// Empty and comment-only rules, which the oracle families do not generate.
const emptyBlocks = [
  'a{}',
  'a{/* c */}',
  '@media (x){}',
  'a{/* c */color:red}',
  'a{color:red}a{}a{/* c */}',
];

// Sheets where a merge splits a rule and the first clone still needs
// canonicalizing, in the margin, padding and border-radius families. They
// are written out by hand, since no oracle family makes a created block
// non-canonical.
const createdBlocks = [
  '@media (a){.x{margin-right:1px;margin-left:1px}}@media (a){.y{margin-left:1px}}@media (a){.x{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}}',
  '.x{margin-right:1px;margin-left:1px}.y{margin-left:1px}.x{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
  '@media (a){.x{border-top-right-radius:1px;border-bottom-left-radius:1px}}@media (a){.y{border-bottom-left-radius:1px}}@media (a){.x{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px}}',
  '@media (a){.x{padding-right:1px;padding-left:1px}}@media (a){.y{padding-left:1px}}@media (a){.x{padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px}}',
];

const inputs = [
  ...emptyBlocks,
  ...createdBlocks,
  ...generateFamilyCases(0x5eed, 200).map(({ css }) => css),
  ...generateResetCases(0x5eed, 100).map(({ css }) => css),
];

/**
 * Canonicalizes every block of the stylesheet's output once more, as the
 * second round would, and returns the blocks whose text changes.
 *
 * @param {string} css the output of a merge pass
 * @return {string[]} the text of each block that changed, before and after
 */
function blocksChangedBySecondRound(css) {
  const root = postcss.parse(css);
  const { placeShorthands, boxSupport, pairShorthands, features } =
    targetSupportOf(browsers);
  const context = longhandContext(
    placeShorthands,
    boxSupport,
    pairShorthands,
    new TextTable()
  );
  const changed = [];
  try {
    withTargetSupport(features, () => {
      const blocks = [root];
      root.walk((node) => {
        if (node.type !== 'rule' && node.type !== 'atrule') return;
        if (!node.nodes?.some((child) => child.type === 'decl')) return;
        blocks.push(node);
      });
      for (const block of blocks) {
        const before = block.toString();
        canonicalize(block, context);
        if (block.toString() !== before) changed.push(before);
      }
      finishColumns(context);
    });
  } finally {
    clearSupportCache();
  }
  return changed;
}

for (const [label, options] of rows) {
  test(`after mergePass with ${label}, canonicalizing any block of the output changes nothing`, () => {
    const failures = [];
    for (const css of inputs) {
      const root = postcss.parse(css);
      mergePass(root, browsers, options);
      const changed = blocksChangedBySecondRound(root.toString());
      if (changed.length > 0) failures.push({ input: css, changed });
    }
    assert.deepEqual(failures, []);
  });
}
