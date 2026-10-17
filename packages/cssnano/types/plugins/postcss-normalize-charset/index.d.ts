export type Options = {
    /**
     * Adds a `@charset` when the file has non-ASCII characters and no charset. (default: true; the default preset sets false)
     */
    add?: boolean;
};
/**
 * @typedef {object} Options
 * @property {boolean} [add] Adds a `@charset` when the file has non-ASCII characters and no charset. (default: true; the default preset sets false)
 */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map