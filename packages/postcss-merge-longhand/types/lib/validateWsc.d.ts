declare const _exports: {
    isBorderStyle: typeof isBorderStyle;
    isBorderWidth: typeof isBorderWidth;
    isColor: typeof isColor;
    isValidWidthStyleColor: typeof isValidWidthStyleColor;
};
export = _exports;
/**
 * @param {string} value
 * @return {boolean}
 */
declare function isBorderStyle(value: string): boolean;
/**
 * @param {string} value
 * @return {boolean}
 */
declare function isBorderWidth(value: string): boolean;
/**
 * @param {string} value
 * @return {boolean}
 */
declare function isColor(value: string): boolean;
/**
 * @param {[string, string, string]} wscs
 * @return {boolean}
 */
declare function isValidWidthStyleColor(wscs: [string, string, string]): boolean;
//# sourceMappingURL=validateWsc.d.ts.map