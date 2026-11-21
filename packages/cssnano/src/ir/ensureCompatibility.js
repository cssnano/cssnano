/** @import {TokenListId} from './tokenLists.js' */
import { scanCompatibility } from './selectorScan.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ScanState} from './selectorScan.js' */

/**
 * What the merge checks need to know about one selector. `compatible` is the
 * scan's verdict; the parser's verdict is `SelectorVerdicts`'s. `prefix` is
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
 * It stops at the first unsupported token, so it never learns the prefix of an
 * incompatible selector. A selector the scan accepts can still be one the
 * parser rejects; the merge asks the parser separately.
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
  return {
    compatible: true,
    prefix: state.vendorPrefix,
    msPlaceholder: state.msPlaceholder,
  };
}
