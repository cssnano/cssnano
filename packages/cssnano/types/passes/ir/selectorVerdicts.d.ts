import type { TokenListId, TokenLists } from './tokenLists.js';
/**
 * The parser's verdict on each selector that a merge asks about. The verdict
 * depends only on the selector's tokens, so it is parsed once per interned id
 * and kept for the run. Only `isValid` writes the table.
 */
export declare class SelectorVerdicts {
    #private;
    /**
     * Whether the selector parser accepts the selector, which a browser would
     * otherwise drop along with the list it is part of.
     *
     * @param {TokenLists} tokenLists the run's lists, which spell the selector
     * @param {TokenListId} id the id of the selector
     * @return {boolean}
     */
    isValid(tokenLists: TokenLists, id: TokenListId): boolean;
}
//# sourceMappingURL=selectorVerdicts.d.ts.map