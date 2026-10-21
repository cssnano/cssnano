import type { Root } from 'postcss';
/**
 * The merge transforms over one stylesheet, in the order the default preset
 * runs them: canonicalize every declaration block, remove duplicates, merge
 * rules, then canonicalize again every block still in the stylesheet.
 *
 * Removing duplicates keeps the last copy, so running it first can delete the
 * declaration that let an earlier one be dropped as overridden.
 *
 * A disabled transform does not act. Without merge-longhand, or without
 * removing duplicates or merging rules, nothing is recorded and the second
 * round is skipped.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers the resolved browser targets
 * @param {ReadonlySet<string>} [enabled] the transforms to run, all by default
 * @return {void}
 */
export declare function mergePass(css: Root, browsers: readonly string[], enabled?: ReadonlySet<string>): void;
/**
 * The `cssnano-merge` plugin: the merge transforms the preset enables, run in
 * one pass over the stylesheet. Without an `enabled` set, all of them run.
 *
 * @param {{ enabled?: ReadonlySet<string> }} [opts]
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: {
    enabled?: ReadonlySet<string>;
}): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
export default pluginCreator;
/**
 * The creator of a pass that runs one transform, so each transform can be
 * tested alone as its own plugin.
 *
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules'} name
 * @return {import('postcss').PluginCreator<object>}
 */
export declare function transformPlugin(name: 'mergeLonghand' | 'discardDuplicates' | 'mergeRules'): import('postcss').PluginCreator<object>;
//# sourceMappingURL=index.d.ts.map