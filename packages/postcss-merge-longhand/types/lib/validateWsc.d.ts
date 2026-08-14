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
 * `<line-width> || <line-style> || <color>` takes its three components in any
 * order and leaves any of them out, but specifies none of them twice and
 * admits nothing else, so `border: solid red red` and `border: 1px solid 50%`
 * are invalid and the browser ignores them.
 *
 * `parseWsc` does not validate this: it overwrites the component a repeat
 * already filled, and ignores unrecognized tokens into whichever slot is still
 * free, so the triple it returns can differ from the input's components.
 *
 * @param {string} value
 * @return {boolean} whether every token of the value specifies a component of
 * its own
 */
declare function specifiesDistinctComponents(value: string): boolean;
//# sourceMappingURL=validateWsc.d.ts.map