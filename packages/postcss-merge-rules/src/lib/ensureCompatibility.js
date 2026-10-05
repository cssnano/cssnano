import { isInvalidSelector } from 'postcss-minify-selectors';
import { scanCompatibility } from './selectorScan.js';

/** @import {ScanState} from './selectorScan.js' */

// Type, class and ID selectors joined by descendant combinators. Every name
// must be a valid <ident-token>, so `#1a` and `.1a` take the full check.
const ident = String.raw`(?:-?[_A-Za-z]|--)[\-\w]*`;
const compound = String.raw`[#.]?${ident}(?:[#.]${ident})*`;
const simpleSelectorRe = new RegExp(`^${compound}(?: +${compound})*$`, 'v');

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
