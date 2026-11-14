import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { decodedPropertyName } from './importanceLanes.js';
import { withoutVendorPrefix } from '../../../../ir/vendorPrefix.js';
import { isBorderStyle, isBorderWidth, isColor } from '../validateWsc.js';
import { isLengthValue, parseDimension } from '../lengthGrammar.js';
import { allPhysicalBorderProperties } from './borderData.js';
import { gridPlacementFamilies } from './gridPlacementForms.js';
import { listStyleFamily } from './listStyleForms.js';
import { textDecorationFamily, textEmphasisFamily } from './textForms.js';
import {
  family,
  keywordParser,
  ruleComponent,
  singleComponent,
} from './pairFamilyBuilders.js';

const { asciiLowerCase } = cssnanoUtils;

/**
 * @typedef {(
 *   decl: import('../blockDeclarations.js').DeclarationItem,
 * ) => string | null} Parser
 */

/**
 * @typedef {{
 *   shorthand: string,
 *   longhands: string[],
 *   aliases: ReadonlySet<string>,
 *   parseValue: Parser[],
 *   emit: (values: string[]) => string | null,
 *   requires?: (values: string[]) => string[],
 *   supportKey: string | null,
 * }} PairFamily
 */

/**
 * Parses `normal | <length-percentage [0,∞]>` for a value that is a single
 * token. A function such as `calc()` or `var()` is not compared.
 *
 * @param {import('../blockDeclarations.js').DeclarationItem} decl
 * @return {string | null}
 */
function parseGap(decl) {
  const trimmed = decl.value.trim();
  const lower = asciiLowerCase(trimmed);
  if (lower === 'normal' || isCssWideKeyword(trimmed)) return trimmed;
  if (singleComponent(decl)?.tokens.length !== 1) return null;
  const dimension = parseDimension(lower);
  if (
    !dimension ||
    !isLengthValue(dimension.number, dimension.unit, true, true)
  ) {
    return null;
  }
  return trimmed;
}

/**
 * Both slots as one value, or one value when they are equal: a lone value
 * sets both axes.
 *
 * @param {string[]} values
 * @return {string}
 */
function emitAxes([first, second]) {
  return asciiLowerCase(first) === asciiLowerCase(second)
    ? first
    : `${first} ${second}`;
}

/**
 * `<flex-direction> || <flex-wrap>`: an omitted component takes its initial
 * value, so the initial ones go, except that the shorthand needs one.
 *
 * @param {string[]} values
 * @return {string}
 */
function emitFlexFlow([direction, wrap]) {
  const components = [];
  if (asciiLowerCase(direction) !== 'row') components.push(direction);
  if (asciiLowerCase(wrap) !== 'nowrap') components.push(wrap);
  return components.length ? components.join(' ') : direction;
}

/**
 * `<line-width> || <line-style> || <color>`: an omitted component takes its
 * initial value, so the initial ones go, except that the shorthand needs one.
 *
 * @param {string[]} values
 * @return {string}
 */
function emitRule(values) {
  const components = values.filter(
    (value, slot) => asciiLowerCase(value) !== ruleInitials[slot]
  );
  return components.length ? components.join(' ') : 'none';
}

/**
 * Like `emitRule`, but the color stays: the initial `outline-color` is
 * `invert`, `currentcolor` or `auto` by specification and engine, so
 * omitting it could change the outline.
 *
 * @param {string[]} values
 * @return {string}
 */
function emitOutline([width, style, color]) {
  const components = [];
  if (asciiLowerCase(width) !== 'medium') components.push(width);
  if (asciiLowerCase(style) !== 'none') components.push(style);
  components.push(color);
  return components.join(' ');
}

/**
 * Two keywords of one overflow axis make a two-value shorthand only newer
 * engines read, so only equal ones merge.
 *
 * @param {string[]} values
 * @return {string | null}
 */
function emitEqualOnly([first, second]) {
  return asciiLowerCase(first) === asciiLowerCase(second) ? first : null;
}

const ruleInitials = ['medium', 'none', 'currentcolor'];

// outline-style takes `auto` and no `hidden`.
const outlineStyle = ruleComponent(
  (text) =>
    (isBorderStyle(text) && asciiLowerCase(text) !== 'hidden') ||
    asciiLowerCase(text) === 'auto'
);

/**
 * An engine without `outline-style: auto` drops the whole shorthand that
 * carries it, so the merge needs every target to parse it.
 *
 * @param {string[]} values
 * @return {string[]}
 */
function outlineFeatures([, style]) {
  return asciiLowerCase(style) === 'auto' ? ['keyword:outline-style-auto'] : [];
}

const overscrollKeywords = keywordParser(new Set(['auto', 'contain', 'none']));
const overflowKeywords = keywordParser(
  new Set(['visible', 'hidden', 'clip', 'scroll', 'auto'])
);
const flexDirection = keywordParser(
  new Set(['row', 'row-reverse', 'column', 'column-reverse'])
);
const flexWrap = keywordParser(new Set(['nowrap', 'wrap', 'wrap-reverse']));

/**
 * `border-block-start` and its three siblings. Which physical side a logical
 * one is depends on the writing mode, so every physical border property
 * shares the cascade with it, and so do the axis shorthands. A block with
 * such a property is left as written. The legacy `-webkit-` and `-moz-`
 * spellings (`border-before`, `border-start`, ...) name the same sides.
 *
 * @type {Record<string, string>}
 */
const legacySideNames = {
  'block-start': 'before',
  'block-end': 'after',
  'inline-start': 'start',
  'inline-end': 'end',
};
const componentNames = ['width', 'style', 'color'];

/**
 * The legacy spellings of some sides: the side shorthand and its components.
 *
 * @param {string[]} sides - keys of `legacySideNames`
 * @return {string[]}
 */
function legacySpellings(sides) {
  return sides.flatMap((side) => {
    const legacy = legacySideNames[side];
    return [
      `border-${legacy}`,
      ...componentNames.map((part) => `border-${legacy}-${part}`),
    ];
  });
}
/**
 * `column-rule` or `row-rule`. `rule` and its per-component forms set the
 * longhands of both. The -break, -inset and -visibility-items longhands are
 * not reset.
 *
 * @param {string} shorthand
 * @return {PairFamily}
 */
function ruleFamily(shorthand) {
  return family(
    shorthand,
    ['width', 'style', 'color'].map((part) => `${shorthand}-${part}`),
    {
      aliases: ['rule', 'rule-width', 'rule-style', 'rule-color'],
      parseValue: [
        ruleComponent(isBorderWidth),
        ruleComponent(isBorderStyle),
        ruleComponent(isColor),
      ],
      emit: emitRule,
      supportKey: null,
    }
  );
}

/** @type {PairFamily[]} */
const logicalBorderSides = Object.entries(legacySideNames).map(([side]) => {
  const shorthand = `border-${side}`;
  const axis = `border-${side.split('-')[0]}`;
  return family(
    shorthand,
    ['width', 'style', 'color'].map((part) => `${shorthand}-${part}`),
    {
      aliases: [
        axis,
        ...componentNames.map((part) => `${axis}-${part}`),
        ...legacySpellings([side]),
        ...allPhysicalBorderProperties,
      ],
      parseValue: [
        ruleComponent(isBorderWidth),
        ruleComponent(isBorderStyle),
        ruleComponent(isColor),
      ],
      emit: emitRule,
    }
  );
});

/**
 * `border-block` or `border-inline`: both sides of an axis. It merges only
 * when the two sides are equal, since the shorthand gives both one value.
 *
 * @param {string} axis
 * @return {PairFamily}
 */
function axisFamily(axis) {
  const sides = [`${axis}-start`, `${axis}-end`];
  const sideParsers = [
    ruleComponent(isBorderWidth),
    ruleComponent(isBorderStyle),
    ruleComponent(isColor),
  ];
  return family(
    `border-${axis}`,
    sides.flatMap((side) =>
      componentNames.map((part) => `border-${side}-${part}`)
    ),
    {
      aliases: [
        ...sides.map((side) => `border-${side}`),
        ...componentNames.map((part) => `border-${axis}-${part}`),
        ...legacySpellings(sides),
        ...allPhysicalBorderProperties,
      ],
      parseValue: [...sideParsers, ...sideParsers],
      emit: emitSides,
    }
  );
}

/**
 * The start and end sides, one value each: the shorthand gives both sides one
 * value, so a difference keeps the sides as written.
 *
 * @param {string[]} values - the start components, then the end components
 * @return {string | null}
 */
function emitSides(values) {
  const start = values.slice(0, 3);
  const differs = start.some(
    (value, slot) => asciiLowerCase(value) !== asciiLowerCase(values[slot + 3])
  );
  return differs ? null : emitRule(start);
}

/** @type {PairFamily[]} */
export const pairFamilies = [
  ...gridPlacementFamilies,
  listStyleFamily,
  textEmphasisFamily,
  textDecorationFamily,
  // grid-gap and its siblings are aliases that share the cascade.
  family('gap', ['row-gap', 'column-gap'], {
    aliases: ['grid-gap', 'grid-row-gap', 'grid-column-gap'],
    parseValue: [parseGap, parseGap],
    emit: emitAxes,
  }),
  family(
    'overscroll-behavior',
    ['overscroll-behavior-x', 'overscroll-behavior-y'],
    {
      // Logical longhands map onto the physical axes by writing mode.
      aliases: ['overscroll-behavior-block', 'overscroll-behavior-inline'],
      parseValue: [overscrollKeywords, overscrollKeywords],
      emit: emitAxes,
    }
  ),
  family('flex-flow', ['flex-direction', 'flex-wrap'], {
    parseValue: [flexDirection, flexWrap],
    emit: emitFlexFlow,
  }),
  ...['column-rule', 'row-rule'].map(ruleFamily),
  family('outline', ['outline-width', 'outline-style', 'outline-color'], {
    parseValue: [
      ruleComponent(isBorderWidth),
      outlineStyle,
      ruleComponent(isColor),
    ],
    emit: emitOutline,
    requires: outlineFeatures,
    supportKey: null,
  }),
  // Before the sides, so that the axis family is first in the reducer's
  // insertion-ordered families and sees both sides before either is merged.
  ...['block', 'inline'].map(axisFamily),
  ...logicalBorderSides,
  family('overflow', ['overflow-x', 'overflow-y'], {
    aliases: ['overflow-block', 'overflow-inline'],
    parseValue: [overflowKeywords, overflowKeywords],
    emit: emitEqualOnly,
    supportKey: null,
  }),
];

/** @type {Map<string, PairFamily[]>} */
const familiesOfName = new Map();
for (const pair of pairFamilies) {
  for (const name of [pair.shorthand, ...pair.longhands, ...pair.aliases]) {
    const families = familiesOfName.get(name);
    if (families) families.push(pair);
    else familiesOfName.set(name, [pair]);
  }
}
/** @type {PairFamily[]} */
const noFamilies = [];

/**
 * Like the alignment families, prefixed and escaped spellings share the
 * cascade with the property they name, so they are seen and block a merge.
 *
 * @param {string} prop - lowercased property name
 * @return {readonly PairFamily[]} every family the property shares the
 *   cascade with: a physical border property is in all four logical sides
 */
export function pairFamiliesOf(prop) {
  const escaped = prop.includes('\\');
  if (!escaped && !prop.startsWith('-')) {
    return familiesOfName.get(prop) ?? noFamilies;
  }
  if (prop.startsWith('--')) return noFamilies;
  const name = escaped ? decodedPropertyName(prop) : prop;
  return name === undefined
    ? noFamilies
    : (familiesOfName.get(withoutVendorPrefix(name)) ?? noFamilies);
}
