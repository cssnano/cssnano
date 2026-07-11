export = pluginCreator;
/**
 * @type {import('postcss').PluginCreator<void>}
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): {
    postcssPlugin: string;
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helper
     */
    OnceExit(css: import('postcss').Root, { result }: import('postcss').Helpers): void;
};
//# sourceMappingURL=index.d.ts.map