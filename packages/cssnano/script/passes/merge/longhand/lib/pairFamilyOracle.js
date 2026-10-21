import {
  gapValue,
  alignContent,
  justifyContent,
  alignItems,
  justifyItems,
  alignSelf,
  justifySelf,
  overscroll,
  overflowAxis,
  flexDirection,
  flexWrap,
  lineWidth,
  lineStyle,
  lineColor,
  unordered,
  copyFirst,
  copyFirstUnlessBaseline,
  sameValue,
  twoValues,
} from './pairFamilyGrammar.js';

/**
 * An independent evaluator for the pair families: shorthands and aliases that
 * write two or more longhands, and what an omitted value becomes. Each family
 * is one row of `pairRows`, written from its specification and never from the
 * plugin's tables, so a webref or plugin error cannot cancel out.
 *
 * Each grammar is a closed alphabet. A token outside it is read as invalid,
 * so the generator must emit only in-alphabet tokens.
 *
 * @typedef {(token: string) => string | undefined} Grammar
 *   A token the grammar accepts, lowercased, or undefined.
 * @typedef {{
 *   names: string[],
 *   parse: (value: string) => (string | undefined)[] | undefined,
 * }} Setter
 *   The longhands a declaration writes, and one value for each, or undefined
 *   when the browser ignores the declaration.
 * @typedef {{
 *   family: string,
 *   longhands: Record<string, string>,
 *   setters: Record<string, Setter>,
 * }} PairRow
 *   `longhands` maps each longhand to its initial value. `setters` maps each
 *   property that writes longhands to its setter.
 */

const cssWideKeywords = new Set(['initial', 'unset', 'inherit']);

/** @type {PairRow[]} */
const pairRows = [
  // CSS Box Alignment 3. `grid-gap` and its legacy longhand names are aliases
  // of `gap`, `row-gap` and `column-gap` and share their cascade.
  {
    family: 'gap',
    longhands: { 'row-gap': 'normal', 'column-gap': 'normal' },
    setters: {
      gap: twoValues(
        ['row-gap', 'column-gap'],
        [gapValue, gapValue],
        copyFirst
      ),
      'grid-gap': twoValues(
        ['row-gap', 'column-gap'],
        [gapValue, gapValue],
        copyFirst
      ),
      'row-gap': sameValue(['row-gap'], gapValue),
      'grid-row-gap': sameValue(['row-gap'], gapValue),
      'column-gap': sameValue(['column-gap'], gapValue),
      'grid-column-gap': sameValue(['column-gap'], gapValue),
    },
  },
  // CSS Box Alignment 3, section 5.2. The overflow-position prefix is outside
  // the alphabet, so a value with it is read as invalid.
  {
    family: 'place-content',
    longhands: { 'align-content': 'normal', 'justify-content': 'normal' },
    setters: {
      'place-content': twoValues(
        ['align-content', 'justify-content'],
        [alignContent, justifyContent],
        copyFirstUnlessBaseline
      ),
      'align-content': sameValue(['align-content'], alignContent),
      'justify-content': sameValue(['justify-content'], justifyContent),
    },
  },
  // CSS Box Alignment 3. An omitted justify-items copies align-items.
  {
    family: 'place-items',
    longhands: { 'align-items': 'normal', 'justify-items': 'normal' },
    setters: {
      'place-items': twoValues(
        ['align-items', 'justify-items'],
        [alignItems, justifyItems],
        copyFirst
      ),
      'align-items': sameValue(['align-items'], alignItems),
      'justify-items': sameValue(['justify-items'], justifyItems),
    },
  },
  // CSS Box Alignment 3. `auto` is valid on both axes and is the initial value.
  {
    family: 'place-self',
    longhands: { 'align-self': 'auto', 'justify-self': 'auto' },
    setters: {
      'place-self': twoValues(
        ['align-self', 'justify-self'],
        [alignSelf, justifySelf],
        copyFirst
      ),
      'align-self': sameValue(['align-self'], alignSelf),
      'justify-self': sameValue(['justify-self'], justifySelf),
    },
  },
  // CSS Overscroll Behavior 1. The block and inline longhands are the y and x
  // axes in horizontal writing, the only mode the composed oracle sets.
  {
    family: 'overscroll-behavior',
    longhands: {
      'overscroll-behavior-x': 'auto',
      'overscroll-behavior-y': 'auto',
    },
    setters: {
      'overscroll-behavior': twoValues(
        ['overscroll-behavior-x', 'overscroll-behavior-y'],
        [overscroll, overscroll],
        copyFirst
      ),
      'overscroll-behavior-x': sameValue(['overscroll-behavior-x'], overscroll),
      'overscroll-behavior-y': sameValue(['overscroll-behavior-y'], overscroll),
      'overscroll-behavior-inline': sameValue(
        ['overscroll-behavior-x'],
        overscroll
      ),
      'overscroll-behavior-block': sameValue(
        ['overscroll-behavior-y'],
        overscroll
      ),
    },
  },
  // CSS Overflow 3. As for overscroll-behavior, block is y and inline is x in
  // horizontal writing.
  // CSS Flexible Box Layout 1. Each component takes its initial value when
  // the shorthand omits it.
  {
    family: 'flex-flow',
    longhands: { 'flex-direction': 'row', 'flex-wrap': 'nowrap' },
    setters: {
      'flex-flow': {
        names: ['flex-direction', 'flex-wrap'],
        parse: unordered([flexDirection, flexWrap], ['row', 'nowrap']),
      },
      'flex-direction': sameValue(['flex-direction'], flexDirection),
      'flex-wrap': sameValue(['flex-wrap'], flexWrap),
    },
  },
  {
    family: 'overflow',
    longhands: { 'overflow-x': 'visible', 'overflow-y': 'visible' },
    setters: {
      overflow: twoValues(
        ['overflow-x', 'overflow-y'],
        [overflowAxis, overflowAxis],
        copyFirst
      ),
      'overflow-x': sameValue(['overflow-x'], overflowAxis),
      'overflow-y': sameValue(['overflow-y'], overflowAxis),
      'overflow-inline': sameValue(['overflow-x'], overflowAxis),
      'overflow-block': sameValue(['overflow-y'], overflowAxis),
    },
  },
  // CSS Multi-column Layout 1 and CSS Gaps 1. The three components take the
  // initial width, style and color when omitted.
  {
    family: 'column-rule',
    longhands: {
      'column-rule-width': 'medium',
      'column-rule-style': 'none',
      'column-rule-color': 'currentcolor',
    },
    setters: {
      'column-rule': {
        names: ['column-rule-width', 'column-rule-style', 'column-rule-color'],
        parse: unordered(
          [lineWidth, lineStyle, lineColor],
          ['medium', 'none', 'currentcolor']
        ),
      },
      'column-rule-width': sameValue(['column-rule-width'], lineWidth),
      'column-rule-style': sameValue(['column-rule-style'], lineStyle),
      'column-rule-color': sameValue(['column-rule-color'], lineColor),
    },
  },
  {
    family: 'row-rule',
    longhands: {
      'row-rule-width': 'medium',
      'row-rule-style': 'none',
      'row-rule-color': 'currentcolor',
    },
    setters: {
      'row-rule': {
        names: ['row-rule-width', 'row-rule-style', 'row-rule-color'],
        parse: unordered(
          [lineWidth, lineStyle, lineColor],
          ['medium', 'none', 'currentcolor']
        ),
      },
      'row-rule-width': sameValue(['row-rule-width'], lineWidth),
      'row-rule-style': sameValue(['row-rule-style'], lineStyle),
      'row-rule-color': sameValue(['row-rule-color'], lineColor),
    },
  },
  // `rule` sets both axes, and each of its component aliases sets the
  // column-rule and row-rule longhand of that component.
  {
    family: 'rule',
    longhands: {
      'column-rule-width': 'medium',
      'column-rule-style': 'none',
      'column-rule-color': 'currentcolor',
      'row-rule-width': 'medium',
      'row-rule-style': 'none',
      'row-rule-color': 'currentcolor',
    },
    setters: {
      rule: {
        names: [
          'column-rule-width',
          'column-rule-style',
          'column-rule-color',
          'row-rule-width',
          'row-rule-style',
          'row-rule-color',
        ],
        parse: (value) => {
          const parts = unordered(
            [lineWidth, lineStyle, lineColor],
            ['medium', 'none', 'currentcolor']
          )(value);
          return parts && [...parts, ...parts];
        },
      },
      'rule-width': sameValue(
        ['column-rule-width', 'row-rule-width'],
        lineWidth
      ),
      'rule-style': sameValue(
        ['column-rule-style', 'row-rule-style'],
        lineStyle
      ),
      'rule-color': sameValue(
        ['column-rule-color', 'row-rule-color'],
        lineColor
      ),
    },
  },
];

/** The family names the pair rows model, one per row. */
export const pairFamilyNames = pairRows.map((row) => row.family);

/**
 * Every property that writes longhands, with the row that owns it.
 *
 * @type {Map<string, {row: PairRow, setter: Setter}>}
 */
const setterOf = new Map();
for (const row of pairRows) {
  for (const [name, setter] of Object.entries(row.setters)) {
    setterOf.set(name, { row, setter });
  }
}

/**
 * The family a property belongs to, or undefined for a property that no row
 * writes.
 *
 * @param {string} prop - lowercased property name
 * @return {string | undefined}
 */
export function pairFamilyOf(prop) {
  return setterOf.get(prop)?.row.family;
}

/**
 * The longhand value a CSS-wide keyword gives: `inherit` stays inherit, and
 * every other keyword gives the initial value, since none of these inherit.
 *
 * @param {string} keyword - lowercased CSS-wide keyword
 * @param {string} initial
 * @return {string}
 */
function cssWideValue(keyword, initial) {
  return keyword === 'inherit' ? 'inherit' : initial;
}

/**
 * The [longhand, value] pairs a declaration writes, or undefined when the
 * browser ignores it.
 *
 * @param {PairRow} row
 * @param {Setter} setter
 * @param {string} value
 * @return {[string, string][] | undefined}
 */
function writesOf(row, { names, parse }, value) {
  const trimmed = value.trim();
  const keyword = trimmed.toLowerCase();
  if (cssWideKeywords.has(keyword)) {
    return names.map((name) => [
      name,
      cssWideValue(keyword, row.longhands[name]),
    ]);
  }
  const parsed = parse(trimmed);
  if (parsed === undefined || parsed.includes(undefined)) return undefined;
  return names.map((name, index) => [name, parsed[index]]);
}

/**
 * The longhands of every pair row, as each element computes them. A longhand
 * no valid declaration writes keeps its initial value. The declarations are
 * read in cascade order, so a later one wins.
 *
 * @param {{prop: string, value: string}[]} applied
 * @return {Record<string, string>}
 */
export function evaluatePairFamilies(applied) {
  /** @type {Record<string, string>} */
  const state = {};
  for (const row of pairRows) Object.assign(state, row.longhands);
  for (const { prop, value } of applied) {
    const name = prop.toLowerCase();
    if (name === 'all') {
      // `all` resets every pair longhand, and only a CSS-wide keyword is valid.
      const keyword = value.trim().toLowerCase();
      if (!cssWideKeywords.has(keyword)) continue;
      for (const row of pairRows) {
        for (const [longhand, initial] of Object.entries(row.longhands)) {
          state[longhand] = cssWideValue(keyword, initial);
        }
      }
      continue;
    }
    const found = setterOf.get(name);
    if (!found) continue;
    for (const [longhand, written] of writesOf(
      found.row,
      found.setter,
      value
    ) ?? []) {
      state[longhand] = written;
    }
  }
  return state;
}
