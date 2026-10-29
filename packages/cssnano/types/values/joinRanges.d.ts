import type { CSSToken } from '@csstools/css-tokenizer';
import type { SelectorRange } from './selectorRanges.js';
export type RangePiece = SelectorRange & {
    list: readonly CSSToken[];
};
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {SelectorRange} from './selectorRanges.js' */
/**
 * A token range of one list, such as a selector's range in its rule's tokens.
 *
 * @typedef {SelectorRange & {list: readonly CSSToken[]}} RangePiece
 */
/**
 * Joins the pieces into one new list, with the separator between each pair.
 * The tokens are shared with their pieces, and renumbering copies only those
 * whose positions moved, so a joined list costs time in its own size.
 *
 * @param {readonly RangePiece[]} pieces
 * @param {readonly CSSToken[]} separator
 * @return {CSSToken[]}
 */
export declare function joinRanges(pieces: readonly RangePiece[], separator: readonly CSSToken[]): CSSToken[];
//# sourceMappingURL=joinRanges.d.ts.map