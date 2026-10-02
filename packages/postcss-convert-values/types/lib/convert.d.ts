export declare const timeConv: Map<string, number>;
export declare const angleConv: Map<string, number>;
export declare const freqConv: Map<string, number>;
export type ConvertOptions = {
    time?: boolean;
    length?: boolean;
    angle?: boolean;
    frequency?: boolean;
};
/** @typedef {{time?: boolean, length?: boolean, angle?: boolean, frequency?: boolean}} ConvertOptions */
/**
 * Accurately round a number to a fixed decimal precision without IEEE-754 binary
 * floating point multiplication errors.
 *
 * @param {number} value
 * @param {number} precision
 * @return {number}
 */
export declare function roundToPrecision(value: number, precision: number): number;
/**
 * Compute the shortest exact scientific notation for a number if one exists.
 *
 * @param {number} num
 * @return {string | undefined}
 */
export declare function toCompactExponent(num: number): string | undefined;
/**
 * @param {number} number
 * @return {string}
 */
export declare function dropLeadingZero(number: number): string;
/**
 * Format a number using standard decimal or compact exponent notation.
 *
 * @param {number} number
 * @param {boolean} [allowExponent=true]
 * @return {string}
 */
export declare function formatNumber(number: number, allowExponent?: boolean): string;
/**
 * @param {number} number
 * @param {string} unit
 * @param {ConvertOptions} [options]
 * @param {boolean} [allowExponent=true] false where only an `<integer>` is valid
 * @return {string}
 */
declare const convert: (number: number, unit: string, options?: ConvertOptions, allowExponent?: boolean) => string;
export default convert;
//# sourceMappingURL=convert.d.ts.map