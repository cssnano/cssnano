export = pluginCreator;
/**
 * @type {import('postcss').PluginCreator<void>}
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): {
    postcssPlugin: string;
    /**
     * @param {import('postcss').Root} css
     * @param {{result: import('postcss').Result & {root: {rawCache?: any}}}} arg
     */
    OnceExit(css: import('postcss').Root, { result }: {
        result: import('postcss').Result & {
            root: {
                rawCache?: any;
            };
        };
    }): void;
};
//# sourceMappingURL=rawCache.d.ts.map