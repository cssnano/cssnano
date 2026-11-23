import type { CSSToken } from '@csstools/css-tokenizer';
import type { TokenLists, TokenListId } from './tokenLists.js';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenLists, TokenListId} from './tokenLists.js' */
/**
 * The selectors of one build, each with the id that its text gives on first
 * use. Two selectors have the same id exactly when their text is equal, so
 * comparing lists of selectors compares integers. An id is the index of the
 * token list that spells the selector, so the list is found by its id.
 */
export declare class SelectorIds {
    #private;
    /**
     * @param {TokenLists} tokenLists the run's lists, which take the tokens of a selector new to the build
     * @param {string} selector
     * @param {readonly CSSToken[]} tokens the tokens of `selector`
     * @return {TokenListId} the id of the selector, given at its first use
     */
    idOf(tokenLists: TokenLists, selector: string, tokens: readonly CSSToken[]): TokenListId;
    /**
     * The ids of the items of a selector list, each item taken as a range of the
     * list's tokens, so no item is tokenized. An item new to the build gets its
     * own renumbered copy of those tokens.
     *
     * @param {TokenLists} tokenLists
     * @param {readonly CSSToken[]} tokens the tokens of the selector list, as written
     * @return {TokenListId[]} the id of each item, in the order of the items
     */
    idsOfList(tokenLists: TokenLists, tokens: readonly CSSToken[]): TokenListId[];
}
//# sourceMappingURL=selectorIds.d.ts.map