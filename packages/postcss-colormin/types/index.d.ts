declare const _exports: import("postcss").PluginCreator<Options>;
export = _exports;
import type browserslist from 'browserslist';
export type MinifyColorOptions = {
    hex?: boolean;
    alphaHex?: boolean;
    rgb?: boolean;
    hsl?: boolean;
    name?: boolean;
    transparent?: boolean;
    /**
     * Whether to minify colors inside custom property values (default: true)
     */
    transformCustomProperties?: boolean;
};
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = MinifyColorOptions & AutoprefixerOptions & BrowserslistOptions;
//# sourceMappingURL=index.d.ts.map