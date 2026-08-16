declare const _exports: {
    isBorderStyle: typeof isBorderStyle;
    isBorderWidth: typeof isBorderWidth;
    isColor: typeof isColor;
    isValidWidthStyleColor: typeof isValidWidthStyleColor;
    specifiesComponent: typeof specifiesComponent;
    specifiesDistinctComponents: typeof specifiesDistinctComponents;
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
 * component to appear at most once. `parseWsc` doesn't enforce this: it
 * overwrites repeated components and discards unrecognized tokens, so the
 * returned triple can differ from the input.
 *
 * @param {string} value
 * @return {boolean} whether every token specifies a distinct component
 */
declare function specifiesDistinctComponents(value: string): boolean;
//# sourceMappingURL=validateWsc.d.ts.map