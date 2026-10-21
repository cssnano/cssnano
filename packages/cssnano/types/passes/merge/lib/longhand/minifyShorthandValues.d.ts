export type Component = {
    raw: string;
    tokens: import('@csstools/css-tokenizer').CSSToken[];
};
export type TransitionSlots = {
    property: Component | null;
    duration: Component | null;
    timingFunction: Component | null;
    delay: Component | null;
};
/** @param {string} property @param {string} value @return {string | null} */
export declare function normalizeValue(property: string, value: string): string | null;
//# sourceMappingURL=minifyShorthandValues.d.ts.map