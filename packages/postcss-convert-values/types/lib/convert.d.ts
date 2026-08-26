export type ConvertOptions = {
    time?: boolean;
    length?: boolean;
    angle?: boolean;
};
/**
 * @param {number} number
 * @param {string} unit
 * @param {ConvertOptions} options
 * @return {string}
 */
declare const convert: (number: number, unit: string, options: ConvertOptions) => string;
export default convert;
//# sourceMappingURL=convert.d.ts.map