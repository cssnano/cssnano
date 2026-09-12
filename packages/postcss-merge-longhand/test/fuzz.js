import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMinimised, report } from '../script/lib/fuzzCheck.js';
import { generate } from '../script/lib/fuzzGenerate.js';
import { specifiesComponent } from '../src/lib/validateWsc.js';

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

const sideProps = ['top', 'right', 'bottom', 'left'].map((s) => [
  `border-${s}-width`,
  `border-${s}-style`,
  `border-${s}-color`,
]);

const compProps = ['width', 'style', 'color'].map((c) => [
  `border-top-${c}`,
  `border-right-${c}`,
  `border-bottom-${c}`,
  `border-left-${c}`,
]);

/**
 * @param {string[]} requiredProps
 * @param {Set<string>} normalProps
 * @param {Set<string>} importantProps
 * @param {Set<string>} allProps
 */
function checkGroupMatch(requiredProps, normalProps, importantProps, allProps) {
  if (!requiredProps.every((p) => allProps.has(p))) return null;
  const isNormal = requiredProps.every((p) => normalProps.has(p));
  const isImportant = requiredProps.every((p) => importantProps.has(p));
  return { isNormal, isImportant, isMixed: !isNormal && !isImportant };
}

/** @param {string[]} decls */
function inspectLaneGroups(decls) {
  const normalProps = new Set();
  const importantProps = new Set();
  const allProps = new Set();

  for (const d of decls) {
    const colonIdx = d.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = d.slice(0, colonIdx).trim().toLowerCase();
    const rest = d.slice(colonIdx + 1).trim();
    const isImportant = rest.toLowerCase().endsWith('!important');
    const val = (isImportant ? rest.slice(0, -10) : rest).trim();
    const comp = prop.split('-').at(-1);
    if (!comp || !specifiesComponent(val, comp)) continue;

    allProps.add(prop);
    if (isImportant) {
      importantProps.add(prop);
    } else {
      normalProps.add(prop);
    }
  }

  const sideMatches = sideProps
    .map((props) =>
      checkGroupMatch(props, normalProps, importantProps, allProps)
    )
    .filter(Boolean);
  const compMatches = compProps
    .map((props) =>
      checkGroupMatch(props, normalProps, importantProps, allProps)
    )
    .filter(Boolean);

  const allMatches = [...sideMatches, ...compMatches];

  return {
    hasSideGroup: sideMatches.length > 0,
    hasCompGroup: compMatches.length > 0,
    hasNormalGroup: allMatches.some((m) => m?.isNormal),
    hasImportantGroup: allMatches.some((m) => m?.isImportant),
    hasMixedGroup: allMatches.some((m) => m?.isMixed),
  };
}

for (const seed of [1, 2, 3, 4]) {
  test(`preserves what the rule means, seed ${seed}`, () => {
    let importantCount = 0;
    let mixedLaneCount = 0;
    let hazardCount = 0;
    let sideGroupCount = 0;
    let compGroupCount = 0;
    let normalGroupCount = 0;
    let importantGroupCount = 0;
    let mixedGroupCount = 0;
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

      const groups = inspectLaneGroups(decls);
      if (groups.hasSideGroup) sideGroupCount++;
      if (groups.hasCompGroup) compGroupCount++;
      if (groups.hasNormalGroup) normalGroupCount++;
      if (groups.hasImportantGroup) importantGroupCount++;
      if (groups.hasMixedGroup) mixedGroupCount++;
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
    assert(
      sideGroupCount >= 20,
      `seed ${seed} should exercise complete side groups`
    );
    assert(
      compGroupCount >= 20,
      `seed ${seed} should exercise complete component groups`
    );
    assert(
      normalGroupCount >= 20,
      `seed ${seed} should exercise complete groups in normal lane`
    );
    assert(
      importantGroupCount >= 20,
      `seed ${seed} should exercise complete groups in !important lane`
    );
    assert(
      mixedGroupCount >= 20,
      `seed ${seed} should exercise mixed-lane complete groups`
    );
  });
}
