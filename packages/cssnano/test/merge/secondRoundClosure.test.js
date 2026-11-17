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
import {
  generateFamilyCases,
  generateResetCases,
} from '../../script/merge/rules/lib/mergeOracle.js';
import { secondRoundOfText } from './longhand/helpers/reduceRuns.js';
import { onlyTransform, MERGE_TRANSFORMS } from './onlyTransform.js';
import { testTargets, withTargets } from '../../../../util/testHelpers.js';
import { browserTargets, resolveTargets } from '#utils/browser-targets';

const browsers = resolveTargets(withTargets(testTargets), undefined);

// Each run of the merge pass: with rule merging, and with it off. Round one
// alone is not closed, which is why the second round exists, so it has no row.
const rows = [
  ['rules', MERGE_TRANSFORMS],
  ['rules off', MERGE_TRANSFORMS.filter((name) => name !== 'mergeRules')],
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

for (const [label, names] of rows) {
  test(`after the merge run with ${label}, the second round changes no block of the output`, () => {
    const failures = [];
    for (const css of inputs) {
      const root = postcss.parse(css);
      postcss([onlyTransform(names)({ [browserTargets]: { query: browsers } })])
        .process(root, { from: undefined })
        .sync();
      const output = root.toString();
      const second = secondRoundOfText(output, browsers);
      if (second !== output) failures.push({ input: css, output, second });
    }
    assert.deepEqual(failures, []);
  });
}
