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
     * @param {readonly CSSToken[]} [tokens] the tokens of `selector`, when the caller holds them
     * @return {TokenListId} the id of the selector, given at its first use
     */
    idOf(tokenLists: TokenLists, selector: string, tokens?: readonly CSSToken[]): TokenListId;
}
//# sourceMappingURL=selectorIds.d.ts.map