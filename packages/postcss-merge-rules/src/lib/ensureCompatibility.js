import { tokenizer, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import { isInvalidSelector } from 'postcss-minify-selectors';
import { advanceAttribute } from './attributeSelector.js';
import { cssSel2, cssSel3, isSupportedCached } from './supportCache.js';

const { asciiLowerCase } = cssnanoUtils;
// Type, class and ID selectors joined by descendant combinators. Every name
// must be a valid <ident-token>, so `#1a` and `.1a` take the full check.
const ident = String.raw`(?:-?[_A-Za-z]|--)[\-\w]*`;
const compound = String.raw`[#.]?${ident}(?:[#.]${ident})*`;
const simpleSelectorRe = new RegExp(`^${compound}(?: +${compound})*$`, 'v');

const cssGencontent = 'css-gencontent';
const cssFirstLetter = 'css-first-letter';
const cssFirstLine = 'css-first-line';
const cssInOutOfRange = 'css-in-out-of-range';
const formValidation = 'form-validation';

const vendorPrefix =
  /-(ah|apple|atsc|epub|hp|khtml|moz|ms|o|rim|ro|tc|wap|webkit|xv)-/v;

const combinatorFeatures = new Map([
  ['~', cssSel3],
  ['>', cssSel2],
  ['+', cssSel2],
]);

/**
 * The one vendor prefix shared by every selector in the list: `''` when no
 * selector is prefixed, and `undefined` when the list mixes prefixed and
 * unprefixed selectors or uses different prefixes. Merging a mixed list
 * would drop its unprefixed selectors from engines matching the prefixed
 * ones, and merging different prefixes drops rules from other engines.
 *
 * @param {string[]} selectors
 * @return {string | undefined}
 */
function sharedVendorPrefix(selectors) {
  let prefix;
  for (const selector of selectors) {
    const match = selector.match(vendorPrefix);
    const selectorPrefix = match === null ? '' : match[0];
    if (prefix === undefined) {
      prefix = selectorPrefix;
    } else if (prefix !== selectorPrefix) {
      return undefined;
    }
  }
  return prefix;
}

const inputPlaceholderRegex = /-ms-input-placeholder/v;
/**
 * Internet Explorer use :-ms-input-placeholder.
 * Microsoft Edge use ::-ms-input-placeholder.
 *
 * @type {(selector: string) => boolean}
 */
const findMsInputPlaceholder = (selector) =>
  inputPlaceholderRegex.test(asciiLowerCase(selector));

/** @type {(selectors: string[]) => string | undefined} */
function findMsVendor(selectors) {
  return selectors.find(findMsInputPlaceholder);
}

/**
 * @param {string[]} selectorsA
 * @param {string[]} selectorsB
 * @return {boolean}
 */
function sameVendor(selectorsA, selectorsB) {
  const prefixA = sharedVendorPrefix(selectorsA);
  const prefixB = sharedVendorPrefix(selectorsB);
  if (prefixA === undefined || prefixB === undefined || prefixA !== prefixB) {
    return false;
  }
  return !(findMsVendor(selectorsA) && findMsVendor(selectorsB));
}

/**
 * @param {string} selector
 * @return {boolean}
 */
function noVendor(selector) {
  return !vendorPrefix.test(selector);
}

// Each value is a caniuse feature key verified to describe exactly that
// pseudo; pseudos without a verified key stay gated below.
const pseudoElements = {
  ':active': cssSel2,
  ':after': cssGencontent,
  ':any-link': 'css-any-link',
  ':autofill': 'css-autofill',
  ':before': cssGencontent,
  ':checked': cssSel3,
  ':default': 'css-default-pseudo',
  ':dir': 'css-dir-pseudo',
  ':disabled': cssSel3,
  ':empty': cssSel3,
  ':enabled': cssSel3,
  ':first-child': cssSel2,
  ':first-letter': cssFirstLetter,
  ':first-line': cssFirstLine,
  ':first-of-type': cssSel3,
  ':focus': cssSel2,
  ':focus-within': 'css-focus-within',
  ':focus-visible': 'css-focus-visible',
  ':fullscreen': 'fullscreen',
  ':has': 'css-has',
  ':hover': cssSel2,
  ':in-range': cssInOutOfRange,
  ':indeterminate': 'css-indeterminate-pseudo',
  ':invalid': formValidation,
  ':is': 'css-matches-pseudo',
  ':lang': cssSel2,
  ':last-child': cssSel3,
  ':last-of-type': cssSel3,
  ':link': cssSel2,
  ':matches': 'css-matches-pseudo',
  ':modal': 'dialog',
  ':not': cssSel3,
  ':nth-child': cssSel3,
  ':nth-last-child': cssSel3,
  ':nth-last-of-type': cssSel3,
  ':nth-of-type': cssSel3,
  ':only-child': cssSel3,
  ':only-of-type': cssSel3,
  ':optional': 'css-optional-pseudo',
  ':out-of-range': cssInOutOfRange,
  ':placeholder-shown': 'css-placeholder-shown',
  ':read-only': 'css-read-only-write',
  ':read-write': 'css-read-only-write',
  ':required': formValidation,
  ':root': cssSel3,
  ':target': cssSel3,
  ':where': 'css-matches-pseudo',
  '::after': cssGencontent,
  '::backdrop': 'dialog',
  '::before': cssGencontent,
  '::file-selector-button': 'css-file-selector-button',
  '::first-letter': cssFirstLetter,
  '::first-line': cssFirstLine,
  '::marker': 'css-marker-pseudo',
  '::placeholder': 'css-placeholder',
  '::selection': 'css-selection',
  ':valid': formValidation,
  ':visited': cssSel2,
};

/**
 * @param {string} selector
 * @return {boolean}
 */
function isCssMixin(selector) {
  return selector[selector.length - 1] === ':';
}

/**
 * @param {string} selector
 * @return {boolean}
 */
function isHostPseudoClass(selector) {
  return selector.includes(':host');
}

/** @import {AttributeScanState} from './attributeSelector.js' */

/**
 * Track bracket nesting outside attribute selectors. Returns false for
 * unbalanced brackets and for a stray `]`.
 *
 * @param {AttributeScanState & {pseudoPrefix: string | undefined, previousDelim: string | undefined}} state
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
 * @param {AttributeScanState & {pseudoPrefix: string | undefined, previousDelim: string | undefined}} state
 * @param {TokenType} type
 * @param {string} value
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function isPseudoSupported(state, type, value, browsers) {
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
  if (!entry) return !noVendor(pseudo);
  return isSupportedCached(entry, browsers);
}

/**
 * Check a token outside of attribute selectors: combinators and pseudos.
 *
 * @param {AttributeScanState & {pseudoPrefix: string | undefined, previousDelim: string | undefined}} state
 * @param {TokenType} type
 * @param {string} value
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function isSelectorTokenSupported(state, type, value, browsers) {
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
  return isPseudoSupported(state, type, value, browsers);
}

/**
 * Scan selector tokens for the compatibility features checked here. This is
 * deliberately not a selector parser: token values remain raw so escaped and
 * differently-cased pseudo names retain the old behavior.
 *
 * @param {string} selector
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function scanCompatibility(selector, browsers) {
  /** @type {AttributeScanState & {pseudoPrefix: string | undefined, previousDelim: string | undefined}} */
  const state = {
    pseudoPrefix: undefined,
    previousDelim: undefined,
    attributeStage: 'none',
    delimiters: [],
  };

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
        !isSelectorTokenSupported(state, type, value, browsers)
      ) {
        return false;
      }
    }
  } catch {
    return false;
  }
  return !state.pseudoPrefix && state.delimiters.length === 0;
}

/**
 * @param {string[]} selectors
 * @param{string[]=} browsers
 * @param{Map<string,boolean>=} compatibilityCache
 * @return {boolean}
 */
function ensureCompatibility(selectors, browsers, compatibilityCache) {
  // Should not merge mixins
  if (selectors.some(isCssMixin)) {
    return false;
  }

  // Should not merge :host selector https://github.com/angular/angular-cli/issues/18672
  if (selectors.some(isHostPseudoClass)) {
    return false;
  }
  return selectors.every((selector) => {
    if (simpleSelectorRe.test(selector)) {
      return true;
    }
    if (compatibilityCache && compatibilityCache.has(selector)) {
      return compatibilityCache.get(selector);
    }
    // The token scan is far cheaper than a full parse, so it runs first.
    const compatible =
      scanCompatibility(selector, browsers) && !isInvalidSelector(selector);
    if (compatibilityCache) {
      compatibilityCache.set(selector, compatible);
    }
    return compatible;
  });
}

export { sameVendor, noVendor, pseudoElements, ensureCompatibility };
