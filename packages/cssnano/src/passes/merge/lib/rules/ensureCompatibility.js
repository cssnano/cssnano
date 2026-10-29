import { isInvalidSelector } from '#postcss-minify-selectors';
import { selectorRanges } from '../../../../values/selectorRanges.js';
import { sourceSelector } from '../../../../utils/sourceText.js';
import { scanCompatibility } from './selectorScan.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Rule} from 'postcss' */
/** @import {ScanState} from './selectorScan.js' */
/** @import {SelectorRange} from '../../../../values/selectorRanges.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */

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

/**
 * The token ranges of one rule's selectors, for the tokens that spell the
 * rule's text. `selectors` is the rule's own list, and the ranges are
 * usable only while they match it one for one.
 *
 * @typedef {{source: string, list: readonly CSSToken[], spans: SelectorRange[], selectors: string[]}} RuleSpans
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
 * Finds the token ranges of each rule's selectors. A rule's ranges last while
 * its tokens do, so each rule is split once per change.
 */
class RuleSpanTable {
  /** @type {TextTable | undefined} */
  #table;
  /** @type {WeakMap<Rule, RuleSpans>} */
  #spans = new WeakMap();

  /** @param {TextTable | undefined} table */
  constructor(table) {
    this.#table = table;
  }

  /**
   * @param {Rule} rule
   * @return {RuleSpans}
   */
  of(rule) {
    const list = /** @type {TextTable} */ (this.#table).tokens(rule);
    let spans = this.#spans.get(rule);
    if (spans === undefined || spans.list !== list) {
      spans = {
        source: sourceSelector(rule),
        list,
        spans: selectorRanges(list),
        selectors: rule.selectors,
      };
      this.#spans.set(rule, spans);
    }
    return spans;
  }
}

/**
 * Parses the selector from its range in the rule's tokens when the ranges
 * match the rule's list, and tokenizes the selector otherwise.
 *
 * @param {string} selector
 * @param {RuleSpanTable} spanTable
 * @param {Rule | undefined} rule the rule the selector belongs to
 * @param {number | undefined} index where the selector is in the rule's list
 * @return {boolean}
 */
function isInvalidSelectorOf(selector, spanTable, rule, index) {
  if (rule === undefined || index === undefined) {
    return isInvalidSelector(selector);
  }
  const { source, list, spans, selectors } = spanTable.of(rule);
  if (spans.length !== selectors.length || selectors[index] !== selector) {
    return isInvalidSelector(selector);
  }
  const { start, end } = spans[index];
  return isInvalidSelector(source, list, start, end);
}

/**
 * @param {string} selector
 * @param {readonly string[]} browsers
 * @param {RuleSpanTable} spanTable
 * @param {Rule | undefined} rule
 * @param {number | undefined} index
 * @return {SelectorInfo}
 */
function computeSelectorInfo(selector, browsers, spanTable, rule, index) {
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
  if (isInvalidSelectorOf(selector, spanTable, rule, index)) {
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
 * rule a selector belongs to parses it from that rule's tokens. Do not pass
 * it to `map`, which would give the index as the rule.
 *
 * @param {readonly string[]} browsers
 * @param {Map<string, SelectorInfo>} [cache]
 * @param {TextTable} [table] the tokens of the rules' selectors
 * @return {(selector: string, rule?: Rule, index?: number) => SelectorInfo}
 */
export function createSelectorLookup(browsers, cache = new Map(), table) {
  const spanTable = new RuleSpanTable(table);
  return (selector, rule, index) => {
    let info = cache.get(selector);
    if (info === undefined) {
      info = computeSelectorInfo(selector, browsers, spanTable, rule, index);
      cache.set(selector, info);
    }
    return info;
  };
}

/**
 * @param {string[]} selectors
 * @param {(selector: string, rule?: Rule, index?: number) => SelectorInfo} lookup
 * @param {Rule} [rule] the rule whose own list the selectors are, when they are
 * @return {boolean}
 */
export function selectorsCompatible(selectors, lookup, rule) {
  // Should not merge mixins
  if (selectors.some(isCssMixin)) {
    return false;
  }

  // Should not merge :host selector https://github.com/angular/angular-cli/issues/18672
  if (selectors.some(isHostPseudoClass)) {
    return false;
  }
  for (let index = 0; index < selectors.length; index++) {
    if (!lookup(selectors[index], rule, index).compatible) return false;
  }
  return true;
}
