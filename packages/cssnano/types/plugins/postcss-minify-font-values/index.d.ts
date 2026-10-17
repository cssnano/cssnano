export type Options = {
    /**
     * Removes the font families that follow a font keyword, such as `sans-serif`. (default: false)
     */
    removeAfterKeyword?: boolean;
    /**
     * Removes duplicated font families. (default: true)
     */
    removeDuplicates?: boolean;
    /**
     * Removes quotes from font families. A function chooses the property to change for each one. (default: true)
     */
    removeQuotes?: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight');
};
/**
 * @typedef {object} Options
 * @property {boolean} [removeAfterKeyword] Removes the font families that follow a font keyword, such as `sans-serif`. (default: false)
 * @property {boolean} [removeDuplicates] Removes duplicated font families. (default: true)
 * @property {boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight')} [removeQuotes] Removes quotes from font families. A function chooses the property to change for each one. (default: true)
 */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map