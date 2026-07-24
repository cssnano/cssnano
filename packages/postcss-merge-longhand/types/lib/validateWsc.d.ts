declare const _exports: {
    isStyle: typeof isStyle;
    isWidth: typeof isWidth;
    isColor: typeof isColor;
    isValidWsc: typeof isValidWsc;
};
export = _exports;
/**
 * @param {string} value
 * @return {boolean}
 */
declare function isStyle(value: string): boolean;
/**
 * @param {string} value
 * @return {boolean}
 */
declare function isWidth(value: string): boolean;
/**
 * @param {string} value
 * @return {boolean}
 */
declare function isColor(value: string): boolean;
/**
 * @param {[string, string, string]} wscs
 * @return {boolean}
 */
declare function isValidWsc(wscs: [string, string, string]): boolean;
//# sourceMappingURL=validateWsc.d.ts.map