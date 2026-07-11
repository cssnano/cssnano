export = pluginCreator;
/**
 * @type {import('postcss').PluginCreator<void>}
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): {
    postcssPlugin: string;
    prepare(): {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css: import('postcss').Root): void;
    };
};
//# sourceMappingURL=index.d.ts.map