export type CSSToken = ReturnType<typeof import('#utils').default.tokens>[number];
export type NumericSource = {
    index: number;
    raw: string;
    number: number;
    unit: string;
    hasDecimal: boolean;
};
/** @typedef {ReturnType<typeof import('#utils').default.tokens>[number]} CSSToken */
/** @typedef {{index: number, raw: string, number: number, unit: string, hasDecimal: boolean}} NumericSource */
/**
 * Capture one numeric source spelling, including PostCSS's historic `1.em`
 * token shape. Its `index` is the last token of the spelling. Adjacent tokens
 * are next to each other in the list, so no positions are compared.
 *
 * @param {readonly CSSToken[]} input
 * @param {number} index
 * @return {NumericSource | false}
 */
export declare function numericSource(input: readonly CSSToken[], index: number): NumericSource | false;
//# sourceMappingURL=numericSource.d.ts.map