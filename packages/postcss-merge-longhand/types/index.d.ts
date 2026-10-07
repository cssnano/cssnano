import { BoxSupport } from './lib/targetSupport.js';
import type { Container, Declaration } from 'postcss';
import type browserslist from 'browserslist';
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = AutoprefixerOptions & BrowserslistOptions;
export type MergeContext = {
    columnRules: [Container, Declaration[], [Declaration[], Declaration[]]][];
    setsOtherColumn: boolean;
    shorthandMemoTable: Map<string, string | null>;
    placeShorthands: boolean;
    boxSupport: BoxSupport;
};
export type AlignmentDeclarations = {
    decls: Declaration[];
    lanes: [Declaration[], Declaration[]];
};
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(/** @type {Options} */ opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map