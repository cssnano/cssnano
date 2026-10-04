import { tokenizer, TokenType } from '@csstools/css-tokenizer';
import { isInvalidSelector } from 'postcss-minify-selectors';
import { advanceAttribute } from './attributeSelector.js';
import { cssSel2, cssSel3, isSupportedCached } from './supportCache.js';
import cssnanoUtils from 'cssnano-utils';

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

const combinatorFeatures = new Map([
  ['~', cssSel3],
  ['>', cssSel2],
  ['+', cssSel2],
]);

// Each value is a caniuse feature key verified to describe exactly that
// pseudo; pseudos without a verified key stay gated below.
export const pseudoElements = {
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

const vendorPrefixes = new Set([
  '-ah-',
  '-apple-',
  '-atsc-',
  '-epub-',
  '-hp-',
  '-khtml-',
  '-moz-',
  '-ms-',
  '-o-',
  '-rim',
  '-ro-',
  '-tc-',
  '-wap-',
  '-webkit-',
  '-xv-',
]);

/**
 * The vendor prefix of a pseudo-class or pseudo-element name, such as
 * `-moz-` for `-moz-selection`; a prefix is meaningful only at the start of
 * an identifier, so `x-moz-y` has none.
 *
 * @param {string} name unescaped and in ASCII lower case
 * @return {string} the prefix, or the empty string when there is none
 */
export function vendorPrefixOf(name) {
  if (name[0] !== '-') return '';
  const prefix = name.slice(0, name.indexOf('-', 1) + 1);
  return vendorPrefixes.has(prefix) ? prefix : '';
}

/**
 * Internet Explorer uses :-ms-input-placeholder.
 * Microsoft Edge uses ::-ms-input-placeholder.
 *
 * @param {string} name unescaped and in ASCII lower case
 * @return {boolean}
 */
export function isMsInputPlaceholder(name) {
  return name === '-ms-input-placeholder';
}

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
function scanCompatibility(selector, browsers, state) {
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

/**
 * What the merge checks need to know about one selector. `prefix` is
 * `undefined` for an incompatible selector, which never merges, and for one
 * that mixes vendor prefixes.
 *
 * @typedef {{compatible: boolean, prefix: string | undefined, msPlaceholder: boolean}} SelectorInfo
 */

/** @type {SelectorInfo} */
const simpleInfo = { compatible: true, prefix: '', msPlaceholder: false };
/** @type {SelectorInfo} */
const incompatibleInfo = {
  compatible: false,
  prefix: undefined,
  msPlaceholder: false,
};

/**
 * @param {string} selector
 * @param {string[] | undefined} browsers
 * @return {SelectorInfo}
 */
function computeSelectorInfo(selector, browsers) {
  if (simpleSelectorRe.test(selector)) return simpleInfo;
  /** @type {ScanState} */
  const state = {
    pseudoPrefix: undefined,
    previousDelim: undefined,
    attributeStage: 'none',
    delimiters: [],
    vendorPrefix: '',
    msPlaceholder: false,
  };
  // The token scan is far cheaper than a full parse, so it runs first. It
  // stops at the first unsupported token, so it never learns the prefix of
  // an incompatible selector.
  if (!scanCompatibility(selector, browsers, state)) return incompatibleInfo;
  if (isInvalidSelector(selector)) return incompatibleInfo;
  return {
    compatible: true,
    prefix: state.vendorPrefix,
    msPlaceholder: state.msPlaceholder,
  };
}

/**
 * Looks up selectors in a cache that is shared by every check, so each
 * distinct selector is scanned once per stylesheet.
 *
 * @param {string[] | undefined} browsers
 * @param {Map<string, SelectorInfo>} [cache]
 * @return {(selector: string) => SelectorInfo}
 */
export function createSelectorLookup(browsers, cache = new Map()) {
  return (selector) => {
    let info = cache.get(selector);
    if (info === undefined) {
      info = computeSelectorInfo(selector, browsers);
      cache.set(selector, info);
    }
    return info;
  };
}

/**
 * @param {string[]} selectors
 * @param {(selector: string) => SelectorInfo} lookup
 * @return {boolean}
 */
export function selectorsCompatible(selectors, lookup) {
  // Should not merge mixins
  if (selectors.some(isCssMixin)) {
    return false;
  }

  // Should not merge :host selector https://github.com/angular/angular-cli/issues/18672
  if (selectors.some(isHostPseudoClass)) {
    return false;
  }
  return selectors.every((selector) => lookup(selector).compatible);
}
