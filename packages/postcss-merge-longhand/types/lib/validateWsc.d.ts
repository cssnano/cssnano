/**
 * @param {string | undefined} value
 * @return {boolean}
 */
declare function isBorderStyle(value: string | undefined): boolean;
/**
 * @param {string | undefined} value
 * @return {boolean}
 */
declare function isBorderWidth(value: string | undefined): boolean;
/**
 * @param {string | undefined} value
 * @return {boolean}
 */
declare function isColor(value: string | undefined): boolean;
/**
 * @param {{width: (string|undefined), style: (string|undefined), color: (string|undefined)}} wscs
 * @return {boolean}
 */
declare function isValidWidthStyleColor(wscs: {
    width: (string | undefined);
    style: (string | undefined);
    color: (string | undefined);
}): boolean;
/**
 * A property that names one component takes one token, so a value of several
 * specifies nothing however well each token reads on its own: the browser
 * ignores `border-left-color: red blue` whole.
 *
 * @param {string} value
 * @param {string} component one of `borderComponents`
 * @return {boolean} whether the value can be what that component is set to
 */
declare function specifiesComponent(value: string, component: string): boolean;
export { isBorderStyle, isBorderWidth, isColor, isValidWidthStyleColor, specifiesComponent, };
//# sourceMappingURL=validateWsc.d.ts.map