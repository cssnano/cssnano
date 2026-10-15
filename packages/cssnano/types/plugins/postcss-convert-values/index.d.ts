import type { TargetOptions } from '#utils';
export type Options = import('./lib/findReplacements.js').Options & TargetOptions;
/**
 * @typedef {import('./lib/findReplacements.js').Options & TargetOptions} Options
 */
/** @param {Options} opts @return {import('postcss').Plugin} */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map