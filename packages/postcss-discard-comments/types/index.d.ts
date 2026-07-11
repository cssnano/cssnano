export = pluginCreator;
export type Options = {
    removeAll?: boolean | undefined;
    removeAllButFirst?: boolean | undefined;
    remove?: ((s: string) => boolean) | undefined;
};
/** @typedef {object} Options
 *  @property {boolean=} removeAll
 *  @property {boolean=} removeAllButFirst
 *  @property {(s: string) => boolean=} remove
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: {}): {
    postcssPlugin: string;
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helper
     */
    OnceExit(css: import('postcss').Root, { list }: import('postcss').Helpers): void;
};
//# sourceMappingURL=index.d.ts.map