import type { TargetOptions } from '#utils';
export type Options = {
    ignore?: string[];
} & TargetOptions;
/**
 * @import {TargetOptions} from '#utils'
 * @typedef {{ignore?: string[]} & TargetOptions} Options
 */
/**
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(options?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map