export = pluginCreator;
/** @typedef {{removeAfterKeyword?: boolean, removeDuplicates?: boolean, removeQuotes?: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight')}} Options */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts: Options): import("postcss").Plugin;
declare namespace pluginCreator {
    export { postcss, Options };
}
declare var postcss: true;
type Options = {
    removeAfterKeyword?: boolean;
    removeDuplicates?: boolean;
    removeQuotes?: boolean | ((prop: string) => "" | "font" | "font-family" | "font-weight");
};
//# sourceMappingURL=index.d.ts.map