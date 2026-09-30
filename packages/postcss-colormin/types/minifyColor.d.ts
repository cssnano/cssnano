/**
 * Performs color value minification if input is a valid CSS color
 *
 * @param {string} input - CSS value
 * @param {import('./index.js').MinifyColorOptions} [options] - object with colordx.minify() options
 * @return {string | undefined}
 */
export declare function tryMinifyColor(input: string, options?: import('./index.js').MinifyColorOptions): string | undefined;
/**
 * Performs color value minification
 *
 * @param {string} input - CSS value
 * @param {import('./index.js').MinifyColorOptions} [options] - object with colordx.minify() options
 * @return {string}
 */
declare function minifyColor(input: string, options?: import('./index.js').MinifyColorOptions): string;
export default minifyColor;
//# sourceMappingURL=minifyColor.d.ts.map