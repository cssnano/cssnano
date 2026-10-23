import { isBoolean } from '../../optionGuards.js';
import type { Root } from 'postcss';
/**
 * The merge transforms over one stylesheet, in the order the default preset
 * runs them: canonicalize every declaration block, remove duplicates, merge
 * rules, then canonicalize again every block still in the stylesheet.
 *
 * Removing duplicates keeps the last copy, so running it first can delete the
 * declaration that let an earlier one be dropped as overridden.
 *
 * Longhand merging and duplicate removal always run. Rule merging runs unless
 * `rules` is false, which also leaves the block table unattached.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers the resolved browser targets
 * @param {{ rules?: boolean }} [options]
 * @return {void}
 */
export declare function mergePass(css: Root, browsers: readonly string[], { rules }?: {
    rules?: boolean;
}): void;
/** The guard for the `rules` option, shared with the preset that validates it. */
export declare const rulesGuard: Readonly<{
    isValid: typeof isBoolean;
    expected: "a boolean";
}>;
/**
 * The `cssnano-merge` plugin: the merge transforms of the default preset, run
 * in one pass over the stylesheet. `rules: false` leaves rule merging out.
 *
 * @param {{ rules?: boolean }} [opts]
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: {
    rules?: boolean;
}): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
export default pluginCreator;
/**
 * The pass of one merge transform, which a preset can run in the place of the
 * merge pass, so each transform can be tested alone.
 *
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules'} name
 * @return {(css: Root, browsers: readonly string[]) => void}
 */
export declare function transformPass(name: 'mergeLonghand' | 'discardDuplicates' | 'mergeRules'): (css: Root, browsers: readonly string[]) => void;
/**
 * The creator of a pass that runs one transform, so each transform can be
 * tested alone as its own plugin.
 *
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules'} name
 * @return {import('postcss').PluginCreator<object>}
 */
export declare function transformPlugin(name: 'mergeLonghand' | 'discardDuplicates' | 'mergeRules'): import('postcss').PluginCreator<object>;
//# sourceMappingURL=index.d.ts.map