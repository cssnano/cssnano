declare const _exports: import("postcss").PluginCreator<Options>;
export = _exports;
export type Options = {
    removeAfterKeyword?: boolean;
    removeDuplicates?: boolean;
    removeQuotes?: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight');
};
//# sourceMappingURL=index.d.ts.map