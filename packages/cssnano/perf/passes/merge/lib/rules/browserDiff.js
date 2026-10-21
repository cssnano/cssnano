import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  browserDifferences,
  browserSweep,
  closePool,
  launchPool,
  maxSkippedShare,
} from '../../../../../script/passes/merge/rules/browserDiff.js';
import { generateFamilyCases } from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';
import { generateCascadeCases } from '../../../../../script/passes/merge/rules/lib/fuzzCascade.js';

// Opt-in: CI has no browser, so the sweep runs only where a developer points
// CHROMIUM_PATH at an installed Chromium or Chrome.
const executablePath = process.env.CHROMIUM_PATH;
const skip = !executablePath && 'CHROMIUM_PATH is not set';

/** @type {Awaited<ReturnType<typeof launchPool>>} */
let browsers = [];
before(async () => {
  if (executablePath) browsers = await launchPool(executablePath);
});
after(() => closePool(browsers));

/**
 * @param {Parameters<typeof browserSweep>[1]} cases
 */
async function assertSweepClean(cases) {
  const { difference, checked, skipped } = await browserSweep(browsers, cases);
  assert.equal(difference, undefined);
  assert.ok(
    skipped <= cases.length * maxSkippedShare,
    `${skipped} of ${cases.length} cases were skipped; ${checked} were checked`
  );
}

// Without this, a harness that read nothing would pass every sweep.
test(
  'Chromium reports a pair whose computed border width changes',
  { skip },
  async () => {
    const [difference] = await browserDifferences(browsers[0], [
      {
        input: 'p{border-top-width:1px;border-top-style:solid}',
        output: 'p{border-top-width:2px;border-top-style:solid}',
      },
    ]);
    assert.equal(difference?.property, 'border-top-width');
  }
);

// In vertical modes, margin-inline-start maps to margin-top, so moving it past
// margin-top changes the result; in horizontal-tb it does not.
test(
  'Chromium reports a reordered margin-inline-start that changes margin-top first in vertical-rl',
  { skip },
  async () => {
    const [difference] = await browserDifferences(browsers[0], [
      {
        input: 'p{margin-inline-start:1px;margin-top:2px}',
        output: 'p{margin-top:2px;margin-inline-start:1px}',
      },
    ]);
    assert.equal(difference?.writingMode, 'vertical-rl');
  }
);

test(
  'Chromium computes the same styles for family stylesheets before and after preset-default, seed 7',
  { skip },
  async () => {
    await assertSweepClean(generateFamilyCases(7, 1000));
  }
);

test(
  'Chromium computes the same styles for family stylesheets before and after preset-default, seed 0xc0ffee',
  { skip },
  async () => {
    await assertSweepClean(generateFamilyCases(0xc0ffee, 1000));
  }
);

test(
  'Chromium computes the same styles for cascade stylesheets before and after preset-default, seed 7',
  { skip },
  async () => {
    await assertSweepClean(generateCascadeCases(7, 1000));
  }
);
