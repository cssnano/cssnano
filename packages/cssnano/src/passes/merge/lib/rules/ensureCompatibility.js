import { isInvalidSelector } from '#postcss-minify-selectors';
import { scanCompatibility } from './selectorScan.js';
import { tokensText } from '../../../../values/tokensText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ScanState} from './selectorScan.js' */

/**
 * What the merge checks need to know about one selector. `prefix` is
 * `undefined` for an incompatible selector, which never merges, and for one
 * that mixes vendor prefixes.
 *
 * @typedef {{compatible: boolean, prefix: string | undefined, msPlaceholder: boolean}} SelectorInfo
 */

/** @type {SelectorInfo} */
const incompatibleInfo = {
  compatible: false,
  prefix: undefined,
  msPlaceholder: false,
};

/**
 * The facts of the selector that a token list spells, for the browsers given.
 * The scan runs first, since it is far cheaper than a parse, and it stops at
 * the first unsupported token, so it never learns the prefix of an
 * incompatible selector.
 *
 * @param {readonly CSSToken[]} tokens the tokens of one selector item
 * @param {readonly string[]} browsers
 * @return {SelectorInfo}
 */
export function selectorInfoOf(tokens, browsers) {
  /** @type {ScanState} */
  const state = {
    pseudoPrefix: undefined,
    previousDelim: undefined,
    attributeStage: 'none',
    delimiters: [],
    vendorPrefix: '',
    msPlaceholder: false,
  };
  if (!scanCompatibility(tokens, browsers, state)) return incompatibleInfo;
  if (isInvalidSelector(tokensText(tokens), tokens, 0, tokens.length)) {
    return incompatibleInfo;
  }
  return {
    compatible: true,
    prefix: state.vendorPrefix,
    msPlaceholder: state.msPlaceholder,
  };
}

/**
 * @param {readonly number[]} ids the id of each selector of a list
 * @param {(id: number) => SelectorInfo} lookup
 * @return {boolean}
 */
export function selectorsCompatible(ids, lookup) {
  for (const id of ids) {
    if (!lookup(id).compatible) return false;
  }
  return true;
}
