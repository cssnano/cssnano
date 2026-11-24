/**
 * Scans the number at the start of a token, following the number grammar of
 * CSS Syntax 3.
 *
 * @param {string} text
 * @return {number} the index just past the number, or -1 when no digit starts
 * the number
 */
export declare function scanNumber(text: string): number;
/**
 * @param {string} text
 * @return {boolean} whether the number at the start of the token is in
 * scientific notation
 */
export declare function hasExponent(text: string): boolean;
/**
 * Splits a whole token into its number and unit, following the number grammar
 * of CSS Syntax 3 through scanNumber.
 *
 * @param {string} text - lowercased, as spelled in the stylesheet
 * @return {{number: number, unit: string} | undefined} the unit is `''` for a
 * bare number and `'%'` for a percentage; `undefined` for anything else
 */
export declare function parseDimension(text: string): {
    number: number;
    unit: string;
} | undefined;
/**
 * Whether a number and unit form a `<length>`, or a `<length-percentage>` where
 * a percentage is allowed. Only zero may go without a unit, and a unit must
 * be a length unit of CSS Values 4.
 *
 * @param {number} number - signed, so that `-0` is told from `0`
 * @param {string} unit - `''` for a bare number, `'%'` for a percentage
 * @param {boolean} percentage - whether a percentage is allowed
 * @param {boolean} nonNegative - whether the grammar bounds the range at zero;
 * a negative zero then counts as negative, which keeps its spelling
 * @return {boolean}
 */
export declare function isLengthValue(number: number, unit: string, percentage: boolean, nonNegative: boolean): boolean;
//# sourceMappingURL=lengthGrammar.d.ts.map