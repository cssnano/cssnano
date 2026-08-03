declare const _exports: import("postcss").PluginCreator<Options>;
export = _exports;
import type browserslist from 'browserslist';
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type OwnOptions = {
    sort?: boolean;
    /**
     * Factor shared prefixes/suffixes in a
     * comma-separated selector list into `:is(...)` when it produces shorter
     * output and is safe with respect to cascade specificity. Automatically
     * skipped when the configured browserslist target doesn't support `:is()`.
     */
    convertToIs?: boolean;
};
export type Options = OwnOptions & AutoprefixerOptions & BrowserslistOptions;
//# sourceMappingURL=index.d.ts.map