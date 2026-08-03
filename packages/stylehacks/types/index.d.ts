declare const _exports: import("postcss").PluginCreator<Options> & {
    detect: (node: import('postcss').Node) => boolean;
};
export = _exports;
import type browserslist from 'browserslist';
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = {
    lint?: boolean;
} & AutoprefixerOptions & BrowserslistOptions;
//# sourceMappingURL=index.d.ts.map