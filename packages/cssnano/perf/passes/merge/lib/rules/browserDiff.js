import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { launchChromium } from '../../../../../../../util/chromium.js';
import {
  browserDifferences,
  firstBrowserDifference,
  loadFixture,
} from '../../../../../script/passes/merge/rules/browserDiff.js';
import { generateFamilyCases } from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';

// Opt-in: CI has no browser, so the sweep runs only where a developer points
// CHROMIUM_PATH at an installed Chromium or Chrome.
const executablePath = process.env.CHROMIUM_PATH;
const skip = !executablePath && 'CHROMIUM_PATH is not set';

/** @type {Awaited<ReturnType<typeof launchChromium>>} */
let browser;
before(async () => {
  if (!executablePath) return;
  browser = await launchChromium(executablePath);
  await loadFixture(browser);
});
after(() => browser?.close());

// Without this, a harness that read nothing would pass every sweep.
test(
  'Chromium reports a pair whose computed border width changes',
  { skip },
  async () => {
    const [difference] = await browserDifferences(browser, [
      {
        input: 'p{border-top-width:1px;border-top-style:solid}',
        output: 'p{border-top-width:2px;border-top-style:solid}',
      },
    ]);
    assert.equal(difference?.property, 'border-top-width');
  }
);

test(
  'Chromium computes the same styles for family stylesheets before and after preset-default, seed 7',
  { skip },
  async () => {
    assert.equal(
      await firstBrowserDifference(browser, generateFamilyCases(7, 1000)),
      undefined
    );
  }
);

test(
  'Chromium computes the same styles for family stylesheets before and after preset-default, seed 0xc0ffee',
  { skip },
  async () => {
    assert.equal(
      await firstBrowserDifference(
        browser,
        generateFamilyCases(0xc0ffee, 1000)
      ),
      undefined
    );
  }
);
