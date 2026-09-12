import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMinimised, report } from '../script/lib/fuzzCheck.js';
import { generate } from '../script/lib/fuzzGenerate.js';

/**
 * A differential sweep: random border, margin and padding rules, each compared
 * against what `script/lib/fuzzEvaluate.js` independently says the rule means.
 *
 * The failures this looks for are wrong values on a side, which read as
 * perfectly plausible CSS — the class hand-written tests and review are worst
 * at. It is here to find *new* bugs cheaply; a case it turns up should be
 * minimised and promoted to a named test in `borders.js`, since editing the
 * generator reshuffles what these seeds produce.
 *
 * `node script/fuzz.js --seed 7 --count 200000` runs the same generator for as
 * long as you like, and is what to reach for after changing a validity or
 * support check.
 */

/* Tuned to keep this file near a second; the soak run is where volume lives. */
const casesPerSeed = 2000;

for (const seed of [1, 2, 3, 4]) {
  test(`preserves what the rule means, seed ${seed}`, () => {
    let importantCount = 0;
    let mixedLaneCount = 0;
    let hazardCount = 0;
    const familiesSeen = new Set();

    for (const css of generate(seed, casesPerSeed)) {
      const failure = checkMinimised(css);

      assert.equal(failure, undefined, failure && report(failure, seed));

      const decls = css.slice(2, -1).split(';');
      const hasImportant = decls.some((d) => d.includes('!important'));
      const hasNormal = decls.some((d) => !d.includes('!important'));
      if (hasImportant) importantCount++;
      if (hasImportant && hasNormal) mixedLaneCount++;
      if (
        css.includes('/*') ||
        css.includes('/ 20px /') ||
        css.includes(' /') ||
        css.includes('-5px')
      ) {
        hazardCount++;
      }
      if (css.includes('radius')) familiesSeen.add('radius');
      if (css.includes('margin')) familiesSeen.add('margin');
      if (css.includes('padding')) familiesSeen.add('padding');
      if (/(?:^|[;{])border(?:-[a-z]+)?:/.test(css)) familiesSeen.add('border');
    }

    assert(
      importantCount >= 200,
      `seed ${seed} should exercise !important declarations`
    );
    assert(
      mixedLaneCount >= 100,
      `seed ${seed} should exercise mixed importance lanes`
    );
    assert(
      hazardCount >= 50,
      `seed ${seed} should exercise parser hazard cases`
    );
    assert.equal(
      familiesSeen.size,
      4,
      `seed ${seed} should exercise all 4 property families`
    );
  });
}
