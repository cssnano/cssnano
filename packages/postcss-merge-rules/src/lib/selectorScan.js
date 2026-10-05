import { tokenizer, TokenType } from '@csstools/css-tokenizer';
import { advanceAttribute } from './attributeSelector.js';
import {
  isMsInputPlaceholder,
  pseudoElements,
  vendorPrefixOf,
} from './pseudoSupport.js';
import { cssSel2, cssSel3, isSupportedCached } from './supportCache.js';
import cssnanoUtils from 'cssnano-utils';

const { asciiLowerCase } = cssnanoUtils;

const combinatorFeatures = new Map([
  ['~', cssSel3],
  ['>', cssSel2],
  ['+', cssSel2],
]);

/** @import {AttributeScanState} from './attributeSelector.js' */

/**
 * @typedef {AttributeScanState & {
 *   pseudoPrefix: string | undefined,
 *   previousDelim: string | undefined,
 *   vendorPrefix: string | undefined,
 *   msPlaceholder: boolean
 * }} ScanState
 */

/**
 * Track bracket nesting outside attribute selectors. Returns false for
 * unbalanced brackets and for a stray `]`.
 *
 * @param {ScanState} state
 * @param {TokenType} type
 * @return {boolean}
 */
function trackDelimiters(state, type) {
  const { delimiters } = state;
  if (type === TokenType.OpenSquare) {
    delimiters.push(type);
    state.attributeStage = 'name';
  } else if (type === TokenType.CloseSquare) {
    return false;
  } else if (type === TokenType.Function || type === TokenType.OpenParen) {
    delimiters.push(TokenType.OpenParen);
  } else if (type === TokenType.CloseParen) {
    if (delimiters.at(-1) !== TokenType.OpenParen) return false;
    delimiters.pop();
  }
  return true;
}

/**
 * A selector with two different vendor prefixes has no single prefix.
 *
 * @param {ScanState} state
 * @param {string} vendor
 */
function trackVendor(state, vendor) {
  const { vendorPrefix } = state;
  if (vendorPrefix === '' || vendorPrefix === vendor) {
    state.vendorPrefix = vendor;
  } else {
    state.vendorPrefix = undefined;
  }
}

/**
 * @param {ScanState} state
 * @param {TokenType} type
 * @param {string} value
 * @param {string} name the unescaped identifier or function name
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function isPseudoSupported(state, type, value, name, browsers) {
  if (type === TokenType.Colon) {
    // `:::` is not a valid pseudo-class or pseudo-element.
    if (state.pseudoPrefix === '::') return false;
    state.pseudoPrefix = state.pseudoPrefix ? '::' : ':';
    return true;
  }
  const { pseudoPrefix } = state;
  state.pseudoPrefix = undefined;
  if (!pseudoPrefix) return true;
  let rawName = '';
  if (type === TokenType.Function) {
    rawName = value.slice(0, -1);
  } else if (type === TokenType.Ident) {
    rawName = value;
  }
  // A colon must be followed directly by an identifier or function name.
  if (!rawName) return false;
  const pseudo = `${pseudoPrefix}${rawName}`;
  const entry =
    pseudoElements[/** @type {keyof typeof pseudoElements} */ (pseudo)];
  if (entry) return isSupportedCached(entry, browsers);
  // Pseudo names are ASCII case-insensitive and may be written with escapes.
  const unescaped = asciiLowerCase(name);
  const vendor = vendorPrefixOf(unescaped);
  if (vendor === '') return false;
  trackVendor(state, vendor);
  if (isMsInputPlaceholder(unescaped)) state.msPlaceholder = true;
  return true;
}

/**
 * Check a token outside of attribute selectors: combinators and pseudos.
 *
 * @param {ScanState} state
 * @param {TokenType} type
 * @param {string} value
 * @param {string} name the unescaped identifier or function name
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function isSelectorTokenSupported(state, type, value, name, browsers) {
  // No browser implements the column combinator `||` or `/deep/`, so a
  // selector using either is dropped as invalid.
  const previousDelim = state.previousDelim;
  state.previousDelim = type === TokenType.Delim ? value : undefined;
  if (value === '/' && type === TokenType.Delim) return false;
  if (value === '|' && previousDelim === '|') return false;
  if (type === TokenType.Delim) {
    const feature = combinatorFeatures.get(value);
    if (feature && !isSupportedCached(feature, browsers)) return false;
  }
  return isPseudoSupported(state, type, value, name, browsers);
}

/**
 * Scan selector tokens for the compatibility features checked here, and
 * record the vendor prefix of its pseudo names in `state`. This is
 * deliberately not a selector parser.
 *
 * @param {string} selector
 * @param {string[] | undefined} browsers
 * @param {ScanState} state
 * @return {boolean}
 */
export function scanCompatibility(selector, browsers, state) {
  // A comment between two non-whitespace tokens may be the `/**/` separator
  // that keeps them from fusing (`div/**/span`); such a selector may be
  // invalid, and merging it into a list would make browsers drop the list.
  /** @type {TokenType | undefined} */
  let previousType;
  let separatorComment = false;

  try {
    const tokenStream = tokenizer({ css: selector });
    while (!tokenStream.endOfFile()) {
      const token = tokenStream.nextToken();
      const type = token[0];
      const value = token[1];
      const name =
        type === TokenType.Ident || type === TokenType.Function
          ? token[4].value
          : '';

      if (type === TokenType.EOF) break;
      if (state.attributeStage === 'none') {
        if (type === TokenType.Comment) {
          separatorComment ||=
            previousType !== undefined && previousType !== TokenType.Whitespace;
          continue;
        }
        if (separatorComment && type !== TokenType.Whitespace) return false;
        separatorComment = false;
      }
      if (type !== TokenType.Comment) previousType = type;
      if (state.attributeStage !== 'none') {
        if (!advanceAttribute(state, type, value, browsers)) return false;
      } else if (
        !trackDelimiters(state, type) ||
        !isSelectorTokenSupported(state, type, value, name, browsers)
      ) {
        return false;
      }
    }
  } catch {
    return false;
  }
  return !state.pseudoPrefix && state.delimiters.length === 0;
}
