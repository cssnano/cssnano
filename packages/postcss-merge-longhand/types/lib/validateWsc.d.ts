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
/**
 * The grammar `<line-width> || <line-style> || <color>` requires each
 * component to appear at most once, and every token to specify one. This is
 * the same judgment `parseWsc` makes while parsing; keep the two in step.
 *
 * @param {string} value
 * @return {boolean} whether every token specifies a distinct component
 */
declare function specifiesDistinctComponents(value: string): boolean;
export { isBorderStyle, isBorderWidth, isColor, isValidWidthStyleColor, specifiesComponent, specifiesDistinctComponents, };
//# sourceMappingURL=validateWsc.d.ts.map