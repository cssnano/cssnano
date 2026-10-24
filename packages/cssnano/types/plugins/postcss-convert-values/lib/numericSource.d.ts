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
 * Capture one numeric token as a source spelling. A dot after a number is not
 * part of it, as CSS reads `1.` and `1.em` as a number and a delim: those are
 * invalid, so the value keeps them.
 *
 * @param {readonly CSSToken[]} input
 * @param {number} index
 * @return {NumericSource | false}
 */
export declare function numericSource(input: readonly CSSToken[], index: number): NumericSource | false;
//# sourceMappingURL=numericSource.d.ts.map