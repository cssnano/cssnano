/**
 * The selectors of one run, each with an integer id that its text gives on
 * first use. Two selectors have the same id exactly when their text is equal,
 * so comparing lists of selectors compares integers.
 */
export declare class SelectorIds {
    #private;
    /**
     * @param {string} selector
     * @return {number} the id of the selector, given at its first use
     */
    idOf(selector: string): number;
}
//# sourceMappingURL=selectorIds.d.ts.map