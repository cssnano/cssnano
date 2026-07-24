declare const _exports: import("postcss").PluginCreator<Options>;
export = _exports;
import browserslist = require('browserslist');
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = AutoprefixerOptions & BrowserslistOptions;
//# sourceMappingURL=index.d.ts.map