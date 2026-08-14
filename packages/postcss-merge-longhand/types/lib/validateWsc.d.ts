declare const _exports: {
    isBorderStyle: typeof isBorderStyle;
    isBorderWidth: typeof isBorderWidth;
    isColor: typeof isColor;
    isValidWidthStyleColor: typeof isValidWidthStyleColor;
    statesComponent: typeof statesComponent;
    statesDistinctComponents: typeof statesDistinctComponents;
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
 * @param {string} value
 * @param {string} component one of `borderComponents`
 * @return {boolean} whether the value can be what that component is set to
 */
declare function statesComponent(value: string, component: string): boolean;
/**
 * `<line-width> || <line-style> || <color>` takes its three components in any
 * order and leaves any of them out, but states none of them twice and admits
 * nothing else, so `border: solid red red` and `border: 1px solid 50%` are
 * invalid and the browser drops them whole.
 *
 * `parseWsc` cannot say so: it overwrites the component a repeat already
 * filled, and drops a token it recognises as nothing into whichever slot is
 * still free, so the triple it hands back can be one the value never stated.
 *
 * @param {string} value
 * @return {boolean} whether every token of the value states a component of its
 * own
 */
declare function statesDistinctComponents(value: string): boolean;
//# sourceMappingURL=validateWsc.d.ts.map