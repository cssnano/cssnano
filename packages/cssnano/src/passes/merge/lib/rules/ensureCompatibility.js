import { isInvalidSelector } from '#postcss-minify-selectors';
import { scanCompatibility } from './selectorScan.js';

/** @import {ScanState} from './selectorScan.js' */
/** @import {SelectorList} from './selectorList.js' */

// Type, class and ID selectors joined by descendant combinators. Every name
// must be a valid <ident-token>, so `#1a` and `.1a` take the full check.
const ident = String.raw`(?:-?[_A-Za-z]|--)[\-\w]*`;
const compound = String.raw`[#.]?${ident}(?:[#.]${ident})*`;
export const simpleSelectorRe = new RegExp(
  `^${compound}(?: +${compound})*$`,
  'v'
);

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
 * Parses the selector from its range in the list's tokens when the ranges
 * match the list one for one, and tokenizes the selector otherwise.
 *
 * @param {string} selector
 * @param {SelectorList | undefined} list the list the selector belongs to
 * @param {number | undefined} index where the selector is in the list
 * @return {boolean}
 */
function isInvalidSelectorOf(selector, list, index) {
  if (list === undefined || index === undefined) {
    return isInvalidSelector(selector);
  }
  const { source, tokens, spans } = list.rangesOf();
  const { selectors } = list;
  if (spans.length !== selectors.length || selectors[index] !== selector) {
    return isInvalidSelector(selector);
  }
  const { start, end } = spans[index];
  return isInvalidSelector(source, tokens, start, end);
}

/**
 * @param {string} selector
 * @param {readonly string[]} browsers
 * @param {SelectorList | undefined} list
 * @param {number | undefined} index
 * @return {SelectorInfo}
 */
function computeSelectorInfo(selector, browsers, list, index) {
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
  if (isInvalidSelectorOf(selector, list, index)) {
    return incompatibleInfo;
  }
  return {
    compatible: true,
    prefix: state.vendorPrefix,
    msPlaceholder: state.msPlaceholder,
  };
}

/**
 * Looks up selectors in a cache that is shared by every check, so each
 * distinct selector is scanned once per stylesheet. A lookup that names the
 * list a selector belongs to parses it from that list's tokens. Do not pass
 * it to `map`, which would give the index as the list.
 *
 * @param {readonly string[]} browsers
 * @param {Map<string, SelectorInfo>} [cache]
 * @return {(selector: string, list?: SelectorList, index?: number) => SelectorInfo}
 */
export function createSelectorLookup(browsers, cache = new Map()) {
  return (selector, list, index) => {
    let info = cache.get(selector);
    if (info === undefined) {
      info = computeSelectorInfo(selector, browsers, list, index);
      cache.set(selector, info);
    }
    return info;
  };
}

/**
 * @param {string[]} selectors
 * @param {(selector: string, list?: SelectorList, index?: number) => SelectorInfo} lookup
 * @param {SelectorList} [list] the list whose own selectors these are, when they are
 * @return {boolean}
 */
export function selectorsCompatible(selectors, lookup, list) {
  // Should not merge mixins
  if (selectors.some(isCssMixin)) {
    return false;
  }

  // Should not merge :host selector https://github.com/angular/angular-cli/issues/18672
  if (selectors.some(isHostPseudoClass)) {
    return false;
  }
  for (let index = 0; index < selectors.length; index++) {
    if (!lookup(selectors[index], list, index).compatible) return false;
  }
  return true;
}
