declare const _exports: import("postcss").PluginCreator<Options>;
export = _exports;
import browserslist = require('browserslist');
import convert = require('./lib/convert.js');
export type ConvertOptions = Parameters<typeof convert>[2];
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = {
    precision?: false | number;
    transformCustomProperties?: boolean;
} & ConvertOptions & AutoprefixerOptions & BrowserslistOptions;
//# sourceMappingURL=index.d.ts.map