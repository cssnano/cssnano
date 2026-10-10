import cssnanoUtils from 'cssnano-utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { decodedPropertyName } from './importanceLanes.js';
import { withoutVendorPrefix } from '../vendorPrefix.js';
import { isBorderStyle, isBorderWidth, isColor } from '../validateWsc.js';
import { isUnresolved } from '../unresolved.js';
import { isLengthValue, parseDimension } from '../lengthGrammar.js';
import { splitValue } from '../valueComponents.js';

const { asciiLowerCase } = cssnanoUtils;

/** @typedef {(value: string) => string | null} Parser */

/**
 * @typedef {{
 *   shorthand: string,
 *   longhands: string[],
 *   aliases: ReadonlySet<string>,
 *   parseValue: Parser[],
 *   emit: (values: string[]) => string | null,
 *   supportKey: string | null,
 * }} PairFamily
 */

/**
 * @param {ReadonlySet<string>} keywords - lowercase
 * @return {Parser}
 */
function keywordParser(keywords) {
  return (value) => {
    const trimmed = value.trim();
    const lower = asciiLowerCase(trimmed);
    return keywords.has(lower) || isCssWideKeyword(trimmed) ? trimmed : null;
  };
}

/**
 * The one component of a value, or undefined when a top-level comma, slash or
 * whitespace divides it. Brackets keep their contents together.
 *
 * @param {string} value
 * @return {import('../valueComponents.js').Component | undefined}
 */
function singleComponent(value) {
  const parts = splitValue(value, '/');
  if (parts?.length !== 1) return undefined;
  const [{ components }] = parts;
  return components.length === 1 ? components[0] : undefined;
}

/**
 * Parses `normal | <length-percentage [0,∞]>` for a value that is a single
 * token. A function such as `calc()` or `var()` is not compared.
 *
 * @param {string} value
 * @return {string | null}
 */
function parseGap(value) {
  const trimmed = value.trim();
  const lower = asciiLowerCase(trimmed);
  if (lower === 'normal' || isCssWideKeyword(trimmed)) return trimmed;
  if (singleComponent(trimmed)?.tokens.length !== 1) return null;
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
 * Two keywords of one overflow axis make a two-value shorthand only newer
 * engines read, so only equal ones merge.
 *
 * @param {string[]} values
 * @return {string | null}
 */
function emitEqualOnly([first, second]) {
  return asciiLowerCase(first) === asciiLowerCase(second) ? first : null;
}

/**
 * @param {string} shorthand
 * @param {string[]} longhands
 * @param {Omit<PairFamily, 'shorthand' | 'longhands' | 'aliases' | 'supportKey'> & { aliases?: string[], supportKey?: string | null }} rest
 * @return {PairFamily}
 */
function family(shorthand, longhands, rest) {
  const { aliases = [], supportKey = shorthand, ...behavior } = rest;
  return {
    shorthand,
    longhands,
    aliases: new Set(aliases),
    supportKey,
    ...behavior,
  };
}

const ruleInitials = ['medium', 'none', 'currentcolor'];

/**
 * A single component of the component's own type. A colour function such as
 * `rgb(0,0,0)` is one component. A substitution has no known type and a math
 * function is not compared, so both are left alone.
 *
 * @param {(token: string) => boolean} is
 * @return {Parser}
 */
function ruleComponent(is) {
  return (value) => {
    const trimmed = value.trim();
    if (isCssWideKeyword(trimmed)) return trimmed;
    if (!singleComponent(trimmed) || isUnresolved(trimmed)) return null;
    return is(trimmed) ? trimmed : null;
  };
}

const overscrollKeywords = keywordParser(new Set(['auto', 'contain', 'none']));
const overflowKeywords = keywordParser(
  new Set(['visible', 'hidden', 'clip', 'scroll', 'auto'])
);
const flexDirection = keywordParser(
  new Set(['row', 'row-reverse', 'column', 'column-reverse'])
);
const flexWrap = keywordParser(new Set(['nowrap', 'wrap', 'wrap-reverse']));

/** @type {PairFamily[]} */
export const pairFamilies = [
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
  // rule and its per-component forms set the column-rule longhands too. The
  // column-rule-break, -inset and -visibility-items longhands are not reset.
  family(
    'column-rule',
    ['column-rule-width', 'column-rule-style', 'column-rule-color'],
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
  ),
  family('overflow', ['overflow-x', 'overflow-y'], {
    aliases: ['overflow-block', 'overflow-inline'],
    parseValue: [overflowKeywords, overflowKeywords],
    emit: emitEqualOnly,
    supportKey: null,
  }),
];

/** @type {Map<string, PairFamily>} */
const familyOfName = new Map();
for (const pair of pairFamilies) {
  for (const name of [pair.shorthand, ...pair.longhands, ...pair.aliases]) {
    familyOfName.set(name, pair);
  }
}

/**
 * Like the alignment families, prefixed and escaped spellings share the
 * cascade with the property they name, so they are seen and block a merge.
 *
 * @param {string} prop - lowercased property name
 * @return {PairFamily | undefined}
 */
export function pairFamilyOf(prop) {
  const escaped = prop.includes('\\');
  if (!escaped && !prop.startsWith('-')) return familyOfName.get(prop);
  if (prop.startsWith('--')) return undefined;
  const name = escaped ? decodedPropertyName(prop) : prop;
  return name === undefined
    ? undefined
    : familyOfName.get(withoutVendorPrefix(name));
}
