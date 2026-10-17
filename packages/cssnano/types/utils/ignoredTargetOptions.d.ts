import type { Result } from 'postcss';
/** @import {Result} from 'postcss' */
/**
 * A preset gives every plugin the same targets, so a target option that a
 * user also set on one plugin has no effect. Say so, because the output is
 * written for other browsers than the user may expect. The preset names the
 * plugin by its option key, because PostCSS has not recorded the running
 * plugin yet when plugins prepare.
 * @param {Result | undefined} result
 * @param {string} plugin the key of the plugin in the preset options
 * @param {readonly string[]} ignored the target options the user set on it
 */
export declare function warnIgnoredTargetOptions(result: Result | undefined, plugin: string, ignored: readonly string[]): void;
/**
 * For a plugin that does not read the targets in some configuration, such as
 * minifySelectors with convertToIs disabled, but whose user may still have
 * set target options.
 * @param {object} options the plugin options a preset produced
 * @param {Result | undefined} result
 */
export declare function reportIgnoredTargetOptions(options: object, result: Result | undefined): void;
/**
 * Reports the ignored target options of plugins that never read browser
 * targets, because only a plugin that does could report them itself.
 * @param {{reports: readonly {plugin: string, ignored: readonly string[]}[]}} options
 * @return {import('postcss').Plugin}
 */
export declare function ignoredTargetOptionsPlugin({ reports }: {
    reports: readonly {
        plugin: string;
        ignored: readonly string[];
    }[];
}): import('postcss').Plugin;
export declare namespace ignoredTargetOptionsPlugin {
    var postcss: boolean;
}
//# sourceMappingURL=ignoredTargetOptions.d.ts.map