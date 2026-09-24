export declare const lengthConv: Map<string, number>;
export declare const metricConv: Map<string, number>;
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
 * @param {number} number
 * @return {string}
 */
export declare function dropLeadingZero(number: number): string;
/**
 * @param {number} number
 * @param {string} unit
 * @param {ConvertOptions} options
 * @return {string}
 */
declare const convert: (number: number, unit: string, options: ConvertOptions) => string;
export default convert;
//# sourceMappingURL=convert.d.ts.map