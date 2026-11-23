import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * The text of the tokens from `first` to `last`, both inclusive.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} first the index of the first token, or -1 for no token
 * @param {number} last
 * @return {string}
 */
export declare function textBetween(tokens: readonly CSSToken[], first: number, last: number): string;
/**
 * The items of a selector: its tokens split at the comma tokens outside every
 * parenthesis, each item trimmed of whitespace. A comment is one token, so a
 * comma inside it does not split. Empty items are kept, as PostCSS keeps them.
 *
 * @param {readonly CSSToken[]} tokens the selector's tokens, as written
 * @return {string[]}
 */
export declare function selectorItemsOf(tokens: readonly CSSToken[]): string[];
/**
 * The items of a selector as token ranges, split as selectorItemsOf splits
 * them, so an item's text is `textBetween` of its range.
 *
 * @param {readonly CSSToken[]} tokens the selector's tokens, as written
 * @return {number[]} the first and last token index of each item, in pairs; -1 twice for an empty item
 */
export declare function selectorItemRangesOf(tokens: readonly CSSToken[]): number[];
//# sourceMappingURL=selectorItems.d.ts.map