import { isDeepStrictEqual } from 'node:util';
import postcss from 'postcss';
import {
  cascadedDeclarations,
  directionOf,
  ownsProperty,
  styleOf,
} from './cascadeOracle.js';
import { generateCascadeCases } from './fuzzCascade.js';
import { evaluate as evaluateLonghands } from '../../longhand/lib/fuzzEvaluate.js';
import { computedValues } from '../../longhand/lib/fuzzBoxOracle.js';
import {
  environments as columnEnvironments,
  evaluateColumns,
} from '../../longhand/lib/columnsCascadeOracle.js';
import {
  evaluatePairFamilies,
  pairFamilyNames,
  pairFamilyOf,
} from '../../longhand/lib/pairFamilyOracle.js';

/**
 * The composed merge oracle. Each element's cascade-ordered declarations
 * are rebuilt as one block, and every family evaluator reads that block, so
 * the question of a multi-rule stylesheet becomes a single-block question.
 *
 * The tables here are written from the specification prose and never come
 * from webref or the pass's property data, so a webref error and a pass
 * error cannot cancel out.
 *
 * @import {Environment} from './cascadeOracle.js'
 * @import {CascadeCase} from './fuzzCascade.js'
 */

/** The families the composed oracle evaluates. */
export const modelledFamilies = [
  'border',
  'box',
  'logical-box',
  'radius',
  'columns',
  ...pairFamilyNames,
];

/**
 * Families the pass reduces that no evaluator models yet. The generator must
 * not emit them, and their focused tests are their only coverage. Empty once
 * every family of the merge pass plan has a row.
 *
 * @type {string[]}
 */
export const unmodelledFamilies = [];

/** @type {Environment[]} */
const environments = [
  { print: false, direction: 'ltr' },
  { print: true, direction: 'ltr' },
  { print: false, direction: 'rtl' },
  { print: true, direction: 'rtl' },
];

// Values drawn from each family's alphabet, so that every shorthand and
// longhand form of a family is generated with valid and nearly valid values.
/** @type {[string, string[]][]} */
export const familyProperties = [
  ['border-top-width', ['0', '1px', 'thick']],
  ['border-top-style', ['solid', 'none', 'dashed']],
  ['border-top-color', ['red', 'currentcolor']],
  ['border-top', ['1px solid', 'red', 'solid', '0 none currentcolor']],
  ['border-width', ['0', '1px 2px']],
  ['margin', ['0', '1px', '0 1px']],
  ['margin-top', ['0', '1px']],
  ['margin-left', ['0', '1px']],
  ['margin-inline-start', ['0', '1px']],
  ['margin-block', ['0', '1px 2px']],
  ['padding', ['0', '1px']],
  ['padding-inline', ['0', '1px 2px']],
  ['border-radius', ['0', '1px', '2em 1px']],
  ['border-top-left-radius', ['0', '1px']],
  ['columns', ['10px 2', 'auto 3', '2', '20px']],
  ['column-width', ['10px', 'auto']],
  ['column-count', ['2', 'auto']],
  ['gap', ['1px', '0 normal', 'normal', '2em 10%']],
  ['row-gap', ['1px', '0', 'normal']],
  ['column-gap', ['2em', 'normal']],
  ['grid-gap', ['1px', '10% 0']],
  ['grid-row-gap', ['0', '2em']],
  ['grid-column-gap', ['1px', 'normal']],
  [
    'place-content',
    ['center', 'space-between baseline', 'start end', 'baseline', 'left'],
  ],
  ['align-content', ['center', 'baseline', 'normal', 'space-around']],
  ['justify-content', ['end', 'left', 'start', 'space-evenly']],
  ['place-items', ['center', 'start end', 'left', 'stretch baseline']],
  ['align-items', ['center', 'baseline', 'normal', 'self-end']],
  ['justify-items', ['end', 'left', 'start', 'right']],
  ['place-self', ['auto', 'center end', 'left', 'stretch baseline']],
  ['align-self', ['auto', 'center', 'self-start', 'normal']],
  ['justify-self', ['end', 'left', 'auto', 'right']],
  ['overscroll-behavior', ['none', 'contain auto', 'auto']],
  ['overscroll-behavior-x', ['none', 'contain']],
  ['overscroll-behavior-y', ['auto', 'none']],
  ['overscroll-behavior-block', ['contain', 'none']],
  ['overscroll-behavior-inline', ['auto', 'contain']],
  ['overflow', ['hidden', 'scroll auto', 'visible', 'clip hidden']],
  ['overflow-x', ['clip', 'hidden']],
  ['overflow-y', ['auto', 'visible']],
  ['overflow-block', ['scroll', 'hidden']],
  ['overflow-inline', ['visible', 'auto']],
  ['flex-flow', ['column', 'wrap', 'row nowrap', 'column wrap', 'wrap column']],
  ['flex-direction', ['row', 'column', 'row-reverse']],
  ['flex-wrap', ['nowrap', 'wrap', 'wrap-reverse']],
  ['column-rule', ['1px solid red', 'dashed', 'medium', 'none blue 0']],
  ['column-rule-width', ['thin', '0', 'medium']],
  ['column-rule-style', ['dotted', 'solid']],
  ['column-rule-color', ['red', 'currentcolor']],
  ['row-rule', ['thick dashed', 'solid', 'red 2px']],
  ['row-rule-width', ['2px', 'thick']],
  ['row-rule-style', ['none', 'double']],
  ['row-rule-color', ['blue', 'currentcolor']],
  ['rule', ['1px solid red', 'thin', 'dotted blue', 'none']],
  ['rule-width', ['thin', '0']],
  ['rule-style', ['solid', 'none']],
  ['rule-color', ['red', 'currentcolor']],
];

// `all` resets every family, so no family declaration may move across it.
// Weighted so that it often meets a family declaration on one element.
/** @type {[string, string[]][]} */
const resetProperties = Array.from({ length: 6 }, () => [
  'all',
  ['unset', 'initial'],
]);

/**
 * The modelled family a property belongs to, or undefined for a property
 * that no family evaluator reads.
 *
 * @param {string} prop
 * @return {string | undefined}
 */
function familyOf(prop) {
  const pair = pairFamilyOf(prop);
  if (pair) return pair;
  if (prop.endsWith('-radius') && prop.startsWith('border')) return 'radius';
  if (prop.startsWith('border')) return 'border';
  if (prop === 'columns' || prop.startsWith('column-')) return 'columns';
  if (/^(?:margin|padding)(?:-|$)/v.test(prop)) {
    return /-(?:inline|block)|-(?:start|end)$/v.test(prop)
      ? 'logical-box'
      : 'box';
  }
  return undefined;
}

/**
 * The modelled families a stylesheet declares, sorted.
 *
 * @param {string} css
 * @return {string[]}
 */
export function familiesOf(css) {
  /** @type {Set<string>} */
  const found = new Set();
  postcss.parse(css).walkDecls((declaration) => {
    const family = familyOf(declaration.prop.toLowerCase());
    if (family) found.add(family);
  });
  return [...found].toSorted();
}

/**
 * Every longhand value an element computes, with each key naming the
 * evaluator that produced it. The cascade covers the properties it owns; the
 * family evaluators read the whole block, and the box sides are read in the
 * element's `horizontal-tb` mode, the only mode the generated grammar sets.
 *
 * @param {string} css
 * @param {Environment} environment
 * @return {Map<string, Record<string, string>>}
 */
function composedStates(css, environment) {
  return new Map(
    [...cascadedDeclarations(css, environment)].map(([element, applied]) => {
      const block = `a{${applied
        .map(
          ({ prop, value, important }) =>
            `${prop}:${value}${important ? '!important' : ''}`
        )
        .join(';')}}`;
      const direction = directionOf(applied, environment);
      /** @type {Record<string, string>} */
      const state = {};
      for (const [slot, value] of Object.entries(
        styleOf(
          applied.filter(({ prop }) => ownsProperty(prop)),
          environment
        )
      )) {
        state[`cascade ${slot}`] = value;
      }
      // Only the border and radius slots: the box sides come from
      // `computedValues`, which resolves logical sides in every mode.
      for (const [slot, value] of evaluateLonghands(block)[0]) {
        if (slot.startsWith('border')) state[`longhand ${slot}`] = value;
      }
      for (const [key, value] of Object.entries(computedValues(block))) {
        const [group, mode, side] = key.split('|');
        if (mode === `horizontal-tb ${direction}`) {
          state[`box ${group} ${side}`] = value;
        }
      }
      for (const { name, env } of columnEnvironments) {
        const { width, count } = evaluateColumns(block, env);
        state[`column-width [${name}]`] = width;
        state[`column-count [${name}]`] = count;
      }
      for (const [longhand, value] of Object.entries(
        evaluatePairFamilies(applied)
      )) {
        state[`pair ${longhand}`] = value;
      }
      return [element, state];
    })
  );
}

/**
 * The first element, environment and longhand whose computed value differs
 * between `before` and `after`, or undefined when every element computes the
 * same values in every environment.
 *
 * @param {string} before
 * @param {string} after
 * @param {Environment} [environment] one environment to check; all four
 *   screen/print and ltr/rtl environments when omitted
 * @return {string | undefined}
 */
export function mergeOracleDifference(before, after, environment) {
  for (const env of environment ? [environment] : environments) {
    const expected = composedStates(before, env);
    const actual = composedStates(after, env);
    for (const [element, state] of expected) {
      const other = actual.get(element) ?? {};
      if (isDeepStrictEqual(state, other)) continue;
      const slot = [
        ...new Set([...Object.keys(state), ...Object.keys(other)]),
      ].find((key) => state[key] !== other[key]);
      return `${element} ${JSON.stringify(env)} ${slot}: ${state[slot]} -> ${other[slot]}`;
    }
  }
  return undefined;
}

/**
 * Stylesheets whose rules declare the modelled families, in the cascade
 * fuzzer's rule structures: overlapping selectors, repeats, subsets and
 * supersets, with conditional rules and layers.
 *
 * @param {number} seed
 * @param {number} count
 * @return {CascadeCase[]}
 */
export function generateFamilyCases(seed, count) {
  return generateCascadeCases(seed, count, {
    properties: familyProperties,
    rare: false,
  });
}

/**
 * Family stylesheets whose rules also reset everything with `all`. They are
 * a corpus of their own, so that the family corpus stays the same.
 *
 * @param {number} seed
 * @param {number} count
 * @return {CascadeCase[]}
 */
export function generateResetCases(seed, count) {
  return generateCascadeCases(seed, count, {
    properties: [...familyProperties, ...resetProperties],
    rare: false,
  });
}

/**
 * Throws unless every modelled family occurs in `cases` and no unmodelled
 * family does.
 *
 * @param {CascadeCase[]} cases
 * @return {void}
 */
export function assertFamilyCoverage(cases) {
  const seen = new Set(cases.flatMap(({ css }) => familiesOf(css)));
  for (const family of modelledFamilies) {
    if (!seen.has(family)) throw new Error(`missing family: ${family}`);
  }
  for (const family of unmodelledFamilies) {
    if (seen.has(family)) throw new Error(`unmodelled family: ${family}`);
  }
}
