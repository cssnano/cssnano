import type browserslist from 'browserslist';
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = {
    lint?: boolean;
} & AutoprefixerOptions & BrowserslistOptions;
declare const moduleExports: import('postcss').PluginCreator<Options> & {
    detect: (node: import('postcss').Node) => boolean;
};
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map