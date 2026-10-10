export type CSSToken = ReturnType<typeof import('cssnano-utils').default.tokens>[number];
export type NumericSource = {
    index: number;
    start: number;
    end: number;
    raw: string;
    number: number;
    unit: string;
    hasDecimal: boolean;
};
/** @typedef {ReturnType<typeof import('cssnano-utils').default.tokens>[number]} CSSToken */
/** @typedef {{index: number, start: number, end: number, raw: string, number: number, unit: string, hasDecimal: boolean}} NumericSource */
/**
 * Capture one numeric source spelling, including PostCSS's historic `1.em`
 * token shape. Its `end` is a character offset exclusive of the source.
 *
 * @param {CSSToken[]} input
 * @param {number} index
 * @return {NumericSource | false}
 */
export declare function numericSource(input: CSSToken[], index: number): NumericSource | false;
//# sourceMappingURL=numericSource.d.ts.map