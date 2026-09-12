import assert from 'node:assert/strict';
import { test, suite } from 'node:test';
import postcss from 'postcss';
import { reduceColumns } from '../src/lib/decl/columns.js';
import { random } from '../../../util/fuzzRng.js';
import {
  evaluateColumns,
  environments,
} from '../script/lib/columnsCascadeOracle.js';

/**
 * Deterministic generator for random column declaration rules.
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function generateRandomRule(rng) {
  const widths = ['10px', '12em', '15rem', '20vw', 'calc(5px + 5px)', 'auto'];
  const counts = ['1', '2', '3', '4', 'auto'];
  const cssWide = ['inherit', 'initial', 'unset', 'revert', 'revert-layer'];
  const supportWidths = ['env(col-w)', 'var(--w)'];
  const supportCounts = ['env(col-c)', 'var(--c)'];
  const allWidths = [...widths, ...supportWidths, ...cssWide];
  const allCounts = [...counts, ...supportCounts, ...cssWide];

  const declCount = rng.int(6) + 2; // 2 to 7 declarations
  const decls = [];

  for (let i = 0; i < declCount; i++) {
    const important = rng.chance(0.3) ? ' !important' : '';
    const kind = rng.int(3);

    if (kind === 0) {
      const val = rng.pick(allWidths);
      decls.push(`column-width:${val}${important}`);
    } else if (kind === 1) {
      const val = rng.pick(allCounts);
      decls.push(`column-count:${val}${important}`);
    } else {
      const subKind = rng.int(6);
      let val;
      if (subKind === 0) {
        val = rng.pick(cssWide);
      } else if (subKind === 1) {
        val = `${rng.pick([...widths, ...supportWidths])} ${rng.pick([...counts, ...supportCounts])}`;
      } else if (subKind === 2) {
        val = `${rng.pick([...counts, ...supportCounts])} ${rng.pick([...widths, ...supportWidths])}`;
      } else if (subKind === 3) {
        val = rng.pick([...widths, ...supportWidths]);
      } else if (subKind === 4) {
        val = rng.pick([...counts, ...supportCounts]);
      } else {
        val = rng.pick(['auto', 'auto auto', '10px auto', 'auto 3']);
      }
      decls.push(`columns:${val}${important}`);
    }
  }

  return `h1{${decls.join(';')}}`;
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function generateResetRule(rng) {
  const allImportant = rng.chance(0.5);
  const matching = rng.chance(0.5);
  const declarationImportant = matching ? allImportant : !allImportant;
  const important = declarationImportant ? ' !important' : '';
  const resetImportant = allImportant ? ' !important' : '';
  const prop = rng.chance(0.2) ? 'ALL' : 'all';
  const value = rng.chance(0.5) ? 'initial' : 'unset';
  return `h1{column-width:10px${important};${prop}:${value}${resetImportant};column-count:2${important}}`;
}

/**
 * Deterministic generator for retention-heavy rules.
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function generateRetentionHeavyRule(rng) {
  const decls = [];
  const important = rng.chance(0.4);
  const impStr = important ? ' !important' : '';

  const pattern = rng.int(4);
  if (pattern === 0) {
    // Duplicate width cleanup + companion count
    decls.push(`column-width:10px${impStr}`);
    decls.push(`column-width:20px${impStr}`);
    if (rng.chance(0.5)) decls.push(`column-width:20px${impStr}`);
    decls.push(`column-width:30px${impStr}`);
    decls.push(`column-count:${rng.int(4) + 1}${impStr}`);
  } else if (pattern === 1) {
    // Fallback preservation: plain value then env/var
    decls.push(`column-width:10px${impStr}`);
    decls.push(`column-width:env(col-w)${impStr}`);
    decls.push(`column-count:2${impStr}`);
    if (rng.chance(0.5)) decls.push(`column-count:env(col-c)${impStr}`);
  } else if (pattern === 2) {
    // Overriding shorthand after longhands with fallback
    decls.push('column-width:10px');
    decls.push('column-width:20px');
    decls.push('column-count:2');
    decls.push('columns:40px 4');
    if (rng.chance(0.5)) decls.push('column-width:50px');
  } else {
    // Mixed importance lanes with duplicates
    decls.push('column-width:10px');
    decls.push('column-width:20px');
    decls.push('column-count:2');
    decls.push('column-width:30px !important');
    decls.push('column-width:40px !important');
    decls.push('column-count:4 !important');
  }

  return `h1{${decls.join(';')}}`;
}

suite('randomized seeded differential cascade sweep', () => {
  const casesPerSeed = 250;
  for (const seed of [1, 2, 3, 4]) {
    test(`preserves computed cascade state across environments, seed ${seed}`, () => {
      const rng = random(seed);
      let importantCount = 0;
      let mixedLaneCount = 0;
      let fallbackCount = 0;
      let cssWideCount = 0;
      let reducedCount = 0;
      let matchingResetCount = 0;
      let oppositeResetCount = 0;
      let normalResetCount = 0;
      let importantResetCount = 0;

      for (let i = 0; i < casesPerSeed; i++) {
        let css;
        if (i < 50) css = generateRetentionHeavyRule(rng);
        else if (i < 100) css = generateResetRule(rng);
        else css = generateRandomRule(rng);

        const hasImportant = css.includes('!important');
        const hasNormal =
          css.includes(';') && /(?:^|;)[^;]*:(?:(?!important).)*$/.test(css);
        if (hasImportant) importantCount++;
        if (hasImportant && hasNormal) mixedLaneCount++;
        if (css.includes('env(') || css.includes('var(')) fallbackCount++;
        if (
          css.includes('revert') ||
          css.includes('unset') ||
          css.includes('inherit') ||
          css.includes('initial')
        ) {
          cssWideCount++;
        }
        const reset = /(?:^|;)all:(?:initial|unset)( !important)?;/i.exec(css);
        if (reset) {
          const resetImportant = Boolean(reset[1]);
          if (resetImportant) importantResetCount++;
          else normalResetCount++;
          const declarationImportant = css
            .slice(0, css.toLowerCase().indexOf('all:'))
            .includes('!important');
          if (declarationImportant === resetImportant) matchingResetCount++;
          else oppositeResetCount++;
        }

        const root = postcss.parse(css);
        const rule = /** @type {import('postcss').Rule} */ (root.first);
        reduceColumns(rule);
        const outCss = root.toString();
        if (outCss !== css) reducedCount++;

        for (const { name, env } of environments) {
          const inState = evaluateColumns(css, env);
          const outState = evaluateColumns(outCss, env);
          assert.deepStrictEqual(
            outState,
            inState,
            `Seed ${seed}, case ${i} mismatch in env "${name}":\n  in:  ${css}\n  out: ${outCss}`
          );
        }
      }

      assert(
        importantCount >= 60,
        `seed ${seed} must exercise at least 60 !important declarations`
      );
      assert(
        fallbackCount >= 50,
        `seed ${seed} must exercise at least 50 fallback/substitution rules`
      );
      assert(
        cssWideCount >= 60,
        `seed ${seed} must exercise at least 60 CSS-wide keyword rules`
      );
      assert(
        matchingResetCount >= 10,
        `seed ${seed} should exercise matching-lane all resets`
      );
      assert(
        oppositeResetCount >= 10,
        `seed ${seed} should exercise opposite-lane all resets`
      );
      assert(
        normalResetCount >= 10 && importantResetCount >= 10,
        `seed ${seed} should exercise all resets in both importance lanes`
      );
      assert(reducedCount >= 80, `seed ${seed} must reduce at least 80 rules`);
    });
  }
});
