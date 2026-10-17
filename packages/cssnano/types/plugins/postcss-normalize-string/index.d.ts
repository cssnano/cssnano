export type Options = {
    /**
     * The quote to prefer for strings. (default: 'double')
     */
    preferredQuote?: 'double' | 'single';
};
/**
 * @typedef {object} Options
 * @property {'double' | 'single'} [preferredQuote] The quote to prefer for strings. (default: 'double')
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