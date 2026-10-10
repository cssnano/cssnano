import { isAsciiDigit } from './asciiCharacters.js';
import { withoutVendorPrefix } from './vendorPrefix.js';
/**
 * The syntax a declaration value needs a browser to parse: functions, units,
 * keywords and notations that some browser lacks, spelled as features such
 * as `unit:dvh` that the support data names.
 */
import cssnanoUtils from 'cssnano-utils';
import { colorFunctions } from './spec.js';
import {
  substitutionFunctions,
  trustedSupportFunctions,
} from './unresolved.js';

const { TokenType, asciiLowerCase, decoded, mathFunctions, tokens } =
  cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/* Substitution functions prevent fallback detection because their values
 * are resolved at runtime, not statically analyzable. */
const unresolvableFunctions = substitutionFunctions;

/* rgb() and hsl() are so old that all user agents support them; an author
 * would not write a fallback for them. */
const originalColorFunctions = new Set(['rgb', 'hsl']);

/* CSS Color 3 introduced rgba() and hsla(). */
const colorLevel3Functions = new Set(['rgb', 'rgba', 'hsl', 'hsla']);

/* Ubiquitous functions like rgba() are so widely supported, Opera Mini
 * included, that authors rarely write fallbacks for them. Blocking merges for
 * these would refuse most stylesheets. calc() is not one: Opera Mini drops
 * it, so it blocks a merge unless every target parses it. */
const ubiquitousFunctions = colorLevel3Functions;

/**
 * Functions whose support determines whether a user agent accepts or rejects
 * the declaration; authors write fallbacks for these because browserlist
 * cannot determine support automatically.
 */
const conditionalSupportFunctions = colorFunctions
  .difference(originalColorFunctions)
  .union(trustedSupportFunctions);

/**
 * All functions that block a merge or clone: unresolvable functions and
 * conditionally-supported functions.
 */
const supportDependentFunctions = new Set([
  ...unresolvableFunctions,
  ...conditionalSupportFunctions,
]);

const EMPTY_SET = new Set();
/** @type {Map<string, Set<string>>} */
const supportDepsCache = new Map();

/* Units that every browser back to `longstandingFloor` in targetSupport.js
 * parses: the browser-compat-data browsers, and Opera Mini per caniuse, which
 * lacks viewport units and `ch`. Anything else, including a unit no table
 * knows, counts as newer syntax, so an unknown unit keeps its fallback. */
export const longstandingUnits = new Set([
  'px',
  'em',
  'rem',
  'ex',
  'cm',
  'mm',
  'in',
  'pt',
  'pc',
  'deg',
  'rad',
  'grad',
  'turn',
  's',
  'ms',
]);

/* Functions that every browser back to that floor parses. Any other function
 * counts as newer syntax, because no data shows that every target parses it
 * and a browser drops a declaration it cannot parse whole. Unquoted `url()`
 * is a token of its own, so only the quoted form reaches this list. */
export const longstandingFunctions = new Set(['url', 'rgb', 'hsl']);

/* What every CSS browser parses, however far below that floor: the CSS 1
 * lengths, url() and rgb(). */
const universalUnits = new Set([
  'px',
  'em',
  'ex',
  'in',
  'cm',
  'mm',
  'pt',
  'pc',
]);
const universalFunctions = new Set(['url', 'rgb']);

/* Spellings of newer syntax in the support sets, besides function names. */
const functionFeature = 'function:';
const unitFeature = 'unit:';
const keywordFeature = 'keyword:';
const alphaHexFeature = 'hex-alpha';
/* Division by a dimension, which older engines reject inside calc(). */
const typedDivisionFeature = 'typed-division';

/**
 * The longstanding syntax that a browser below the floor may lack. Every
 * target at or above the floor parses it, so the plugin grants it then.
 *
 * @type {ReadonlySet<string>}
 */
export const longstandingFeatures = new Set([
  ...longstandingUnits
    .difference(universalUnits)
    .values()
    .map((unit) => unitFeature + unit),
  ...longstandingFunctions
    .difference(universalFunctions)
    .values()
    .map((name) => functionFeature + name),
]);

/* The constants of CSS Values 4 math functions, by the feature each needs;
 * `-infinity` arrived with `infinity`. */
const mathConstants = new Map([
  ['e', 'keyword:e'],
  ['pi', 'keyword:pi'],
  ['infinity', 'keyword:infinity'],
  ['-infinity', 'keyword:infinity'],
  ['nan', 'keyword:nan'],
]);

/** CSS-wide keywords that older browsers reject. */
const newerKeywords = new Set(['initial', 'unset', 'revert', 'revert-layer']);

/**
 * Every feature but a ubiquitous function such as `rgba()`,
 * which stylesheets use without fallbacks.
 *
 * @param {string} feature
 * @return {boolean} whether a merged shorthand would be rejected by a browser
 * that lacks the feature, taking the other sides with it
 */
export function blocksMerge(feature) {
  return !ubiquitousFunctions.has(feature);
}

/**
 * A hyphen may also begin a unit (`1-foo`); counting it errs towards
 * tokenizing a value that turns out to need nothing.
 *
 * @param {number} code
 * @return {boolean} whether the code point can begin a dimension's unit
 */
function mayStartUnit(code) {
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95 ||
    code === 45 ||
    code >= 128
  );
}

/* Spellings that begin every newer keyword; `revert` also begins
 * `revert-layer`. */
const keywordStems = ['initial', 'unset', 'revert'];

/**
 * @param {string} value
 * @param {number} index
 * @param {string} word - lowercase ASCII
 * @return {boolean} whether the word begins there, in any letter case
 */
function startsWithWord(value, index, word) {
  for (let offset = 0; offset < word.length; offset++) {
    const code = value.charCodeAt(index + offset);
    const lower = word.charCodeAt(offset);
    if (code !== lower && code !== lower - 32) return false;
  }
  return true;
}

/**
 * A CSS-wide keyword is valid only as the whole value, so only its start
 * needs checking.
 *
 * @param {string} value
 * @return {boolean} whether the value may be a newer keyword
 */
function mayBeNewerKeyword(value) {
  for (const stem of keywordStems) {
    if (startsWithWord(value, 0, stem)) return true;
  }
  return false;
}

/**
 * A cheap test that spares most values from tokenization: newer syntax needs
 * a function, a hash, a unit after a digit, an escape, or a newer CSS-wide
 * keyword.
 *
 * @param {string} value
 * @return {boolean}
 */
function mayNeedSupport(value) {
  if (mayBeNewerKeyword(value)) return true;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code === 40 || code === 35 || code === 92) return true;
    if (
      index > 0 &&
      mayStartUnit(code) &&
      isAsciiDigit(value.charCodeAt(index - 1))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * @param {CSSToken} token
 * @param {boolean} inMath - whether the innermost function is a math function
 * @return {string | undefined} the feature a browser needs to parse the token
 */
function featureOf(token, inMath) {
  switch (token[0]) {
    case TokenType.Function: {
      const name = asciiLowerCase(decoded(token));
      if (supportDependentFunctions.has(name) || name.startsWith('-')) {
        return name;
      }
      return universalFunctions.has(name) ? undefined : functionFeature + name;
    }
    case TokenType.Dimension: {
      const unit = asciiLowerCase(
        /** @type {{ unit: string }} */ (token[4]).unit
      );
      return universalUnits.has(unit) ? undefined : unitFeature + unit;
    }
    case TokenType.Ident: {
      const name = asciiLowerCase(decoded(token));
      if (inMath) return mathConstants.get(name);
      return newerKeywords.has(name) ? keywordFeature + name : undefined;
    }
    case TokenType.Hash: {
      const { length } = decoded(token);
      return length === 4 || length === 8 ? alphaHexFeature : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * @param {string} value
 * @return {Set<string>} the features a browser must support to parse the value
 */
export function supportDependenciesIn(value) {
  if (!mayNeedSupport(value)) {
    return EMPTY_SET;
  }

  const cached = supportDepsCache.get(value);
  if (cached !== undefined) {
    return cached;
  }

  /** @type {Set<string>} */
  const features = new Set();
  /* Whether each enclosing function or block is math, innermost last. */
  /** @type {boolean[]} */
  const enclosing = [];
  let dividing = false;

  for (const token of tokens(value)) {
    const type = token[0];
    if (type === TokenType.Whitespace || type === TokenType.Comment) continue;
    const inMath = enclosing.at(-1) === true;
    // Only a number divides in every engine that parses calc().
    if (dividing && type !== TokenType.Number) {
      features.add(typedDivisionFeature);
    }
    dividing = inMath && type === TokenType.Delim && token[1] === '/';
    if (type === TokenType.Function) {
      enclosing.push(
        mathFunctions.has(withoutVendorPrefix(asciiLowerCase(decoded(token))))
      );
    } else if (type === TokenType.OpenParen) {
      enclosing.push(inMath);
    } else if (type === TokenType.CloseParen) {
      enclosing.pop();
    }
    const feature = featureOf(token, inMath);
    if (feature !== undefined) features.add(feature);
  }

  supportDepsCache.set(value, features);
  return features;
}

/**
 * Values repeat within a file, not across files: drop the memo so a
 * long-running process does not keep every value it has seen.
 *
 * @return {void}
 */
export function clearSupportCache() {
  supportDepsCache.clear();
}
