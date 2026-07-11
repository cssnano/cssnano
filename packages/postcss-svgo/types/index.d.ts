export = pluginCreator;
export type Options = {
    encode?: boolean;
} & import('svgo').Config;
/** @typedef {{encode?: boolean} & import('svgo').Config} Options */
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
    OnceExit(css: import('postcss').Root, { result }: import('postcss').Helpers): void;
};
//# sourceMappingURL=index.d.ts.map