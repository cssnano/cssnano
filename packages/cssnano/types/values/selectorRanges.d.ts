import type { CSSToken } from '@csstools/css-tokenizer';
import type { RangePiece } from './joinRanges.js';
export type SelectorRange = {
    start: number;
    end: number;
};
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from './joinRanges.js' */
/**
 * The token index range of one selector: `end` is exclusive.
 *
 * @typedef {{start: number, end: number}} SelectorRange
 */
/**
 * Splits a rule's selector tokens at the commas that split `rule.selectors`,
 * giving each selector the range it spells. Commas inside functions and
 * parentheses do not split, and whitespace and comments at a selector's ends
 * are not part of it. Empty selectors are kept, as PostCSS keeps them. No
 * token is copied.
 *
 * @param {readonly CSSToken[]} list
 * @return {SelectorRange[]}
 */
export declare function selectorRanges(list: readonly CSSToken[]): SelectorRange[];
/**
 * The ranges of a rule's selectors in its tokens, each with the list it
 * indexes, or null when the ranges do not spell the selectors one for one.
 * Comments at a selector's ends are trimmed from its range, so a selector
 * that keeps one gives null.
 *
 * @param {readonly CSSToken[]} list
 * @param {readonly string[]} selectors
 * @return {RangePiece[] | null}
 */
export declare function selectorPieces(list: readonly CSSToken[], selectors: readonly string[]): RangePiece[] | null;
/**
 * The tokens PostCSS joins the selectors of a list with: the first comma, and
 * the whitespace after it. A list with no comma gets a bare comma, which a
 * single selector never prints.
 *
 * @param {readonly CSSToken[]} list
 * @return {CSSToken[]}
 */
export declare function separatorOf(list: readonly CSSToken[]): CSSToken[];
//# sourceMappingURL=selectorRanges.d.ts.map