declare const _exports: import("postcss").PluginCreator<Options>;
export = _exports;
import type browserslist from 'browserslist';
import type { Declaration } from 'postcss';
export type RuleMeta = {
    /**
     * - Array of selector strings for the rule
     */
    selectors: string[];
    /**
     * - Array of declaration nodes for the rule
     */
    declarations: Declaration[];
    /**
     * - Whether the selectors have been modified and need flushing
     */
    dirty: boolean;
};
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = AutoprefixerOptions & BrowserslistOptions;
//# sourceMappingURL=index.d.ts.map