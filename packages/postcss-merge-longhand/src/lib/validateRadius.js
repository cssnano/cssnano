import { expandFourSides } from './parseTrbl.js';
import { isCssWideKeyword } from './isCssWideKeyword.js';
import cssnanoUtils from 'cssnano-utils';
import { isLengthValue } from './lengthGrammar.js';
import { isUnresolved } from './unresolved.js';
import { closingTokens, splitValue } from './valueComponents.js';

const { TokenType, closeForOpening, numeric } = cssnanoUtils;

/**
 * Whether the tokens of a balanced term are one function with its arguments.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken[]} termTokens
 * @return {boolean}
 */
function isCompleteFunction(termTokens) {
  if (termTokens.length < 2 || termTokens[0][0] !== TokenType.Function) {
    return false;
  }
  let depth = 0;
  for (const [index, token] of termTokens.entries()) {
    if (closeForOpening(token[0]) !== undefined) depth++;
    else if (closingTokens.has(token[0]) && --depth === 0) {
      return index === termTokens.length - 1;
    }
  }
  return false;
}

/**
 * Validates a single token / term as a non-negative <length-percentage> or unresolved function.
 *
 * @param {string} term
 * @param {import('@csstools/css-tokenizer').CSSToken[]} termTokens
 * @return {boolean}
 */
export function isValidLengthPercentage(term, termTokens) {
  if (isCompleteFunction(termTokens)) {
    return isUnresolved(term);
  }

  if (termTokens.length !== 1) {
    return false;
  }

  const value = numeric(termTokens[0]);
  return value !== false && isLengthValue(value.number, value.unit, true, true);
}

/**
 * Splits a value into terms at top-level whitespace and at most one top-level
 * slash.
 *
 * @param {string} value
 * @return {{horizontal: import('./valueComponents.js').Component[], vertical: import('./valueComponents.js').Component[] | null} | null}
 */
function splitRadiusTerms(value) {
  const parts = splitValue(value, '/');
  if (!parts || parts.length > 2) return null;
  return {
    horizontal: parts[0].components,
    vertical: parts[1]?.components ?? null,
  };
}

/**
 * Parses and validates a corner longhand value (e.g. `border-top-left-radius`).
 * Corner longhands accept 1 or 2 non-negative <length-percentage> values.
 *
 * @param {string} value
 * @return {[string, string] | null} [horizontal, vertical] or null if invalid
 */
export function parseCornerRadius(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const split = splitRadiusTerms(trimmed);
  if (!split || split.vertical !== null) {
    /* Slashes are not allowed in corner longhands */
    return null;
  }

  const { horizontal } = split;
  if (horizontal.length !== 1 && horizontal.length !== 2) {
    return null;
  }

  for (const item of horizontal) {
    if (!isValidLengthPercentage(item.raw, item.tokens)) {
      return null;
    }
  }

  if (horizontal.length === 1) {
    return [horizontal[0].raw, horizontal[0].raw];
  }
  return [horizontal[0].raw, horizontal[1].raw];
}

/**
 * Parses and validates a `border-radius` shorthand value.
 * Accepts 1 to 4 horizontal components, optional `/`, and 1 to 4 vertical components.
 *
 * @param {string} value
 * @return {{horizontal: [string, string, string, string], vertical: [string, string, string, string]} | null}
 */
export function parseRadiusShorthand(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const split = splitRadiusTerms(trimmed);
  if (!split) return null;

  const { horizontal, vertical } = split;
  if (horizontal.length === 0 || horizontal.length > 4) {
    return null;
  }

  for (const item of horizontal) {
    if (!isValidLengthPercentage(item.raw, item.tokens)) {
      return null;
    }
  }

  const h4 = expandFourSides(horizontal.map((item) => item.raw));

  if (vertical === null) {
    return {
      horizontal: h4,
      vertical: [...h4],
    };
  }

  if (vertical.length === 0 || vertical.length > 4) {
    return null;
  }

  for (const item of vertical) {
    if (!isValidLengthPercentage(item.raw, item.tokens)) {
      return null;
    }
  }

  const v4 = expandFourSides(vertical.map((item) => item.raw));
  return {
    horizontal: h4,
    vertical: v4,
  };
}

/**
 * Checks whether a declaration value is a global CSS keyword.
 *
 * @param {string} value
 * @return {boolean}
 */
export function isGlobalKeyword(value) {
  return isCssWideKeyword(value.trim());
}
