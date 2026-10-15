import type { TargetOptions } from '#utils';
export type Options = TargetOptions;
/** @import {TargetOptions} from '#utils' */
/**
 * @typedef {TargetOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(options?: {}): {
    postcssPlugin: string;
    /**
     * @param {import('postcss').Result} result
     */
    prepare(result: import('postcss').Result): {
        /** @param {import('postcss').Root} css */
        OnceExit(css: import('postcss').Root): void;
    };
};
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map