declare const _exports: import("postcss").PluginCreator<Options>;
export = _exports;
import type browserslist from 'browserslist';
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = {
    ignore?: string[];
} & AutoprefixerOptions & BrowserslistOptions;
//# sourceMappingURL=index.d.ts.map