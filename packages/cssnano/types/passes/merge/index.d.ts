import { targetSupportOf } from './lib/longhand/targetSupport.js';
import { isBoolean } from '../../optionGuards.js';
import type { BlockRecords } from '../ir/blockRecords.js';
import type { Result, Root } from 'postcss';
import type { RunContext } from '../ir/runContext.js';
import type { LonghandRound } from './lib/longhand/canonicalize.js';
export type RecordTransform = (records: BlockRecords, browsers: readonly string[], context: RunContext) => void;
/**
 * The merge transforms over the records, in the order the default preset runs
 * them: canonicalize every declaration block, remove duplicates, merge rules,
 * then canonicalize again every block still in the stylesheet.
 *
 * Canonicalizing is not idempotent: a block the first round reduced can reduce
 * again, so every block still in the stylesheet gets the second round.
 *
 * @param {BlockRecords} records the records of a built stylesheet
 * @param {readonly string[]} browsers the resolved browser targets
 * @param {RunContext} context the run's context
 * @param {{rules?: boolean, support?: ReturnType<typeof targetSupportOf>}} [options]
 *   whether rules are merged, and the targets' support when the caller has it
 * @return {void}
 */
export declare function mergeRecords(records: BlockRecords, browsers: readonly string[], context: RunContext, { rules, support }?: {
    rules?: boolean;
    support?: ReturnType<typeof targetSupportOf>;
}): void;
export { targetSupportOf };
export type MergeRunner = {
    support: (browsers: readonly string[]) => ReturnType<typeof targetSupportOf>;
    round: (support: ReturnType<typeof targetSupportOf>, context: RunContext) => LonghandRound | undefined;
    merge: (records: BlockRecords, browsers: readonly string[], context: RunContext, options: {
        rules?: boolean;
    }) => void;
};
/** @type {MergeRunner} */
export declare const mergeRunner: MergeRunner;
/**
 * A merge run of the named transforms alone, for a test that pins some of
 * the merge transforms without the preset's order. The names choose which of
 * the three transforms run; the merge runs them in the preset's order.
 * Longhand canonicalizing takes the support of its run.
 *
 * @param {...('mergeLonghand' | 'discardDuplicates' | 'mergeRules')} names
 * @return {MergeRunner}
 */
export declare function transformRunner(...names: ('mergeLonghand' | 'discardDuplicates' | 'mergeRules')[]): MergeRunner;
/**
 * The merge transforms over one stylesheet, as one run of the driver: build,
 * the merge transforms, then the end of the run.
 *
 * Longhand merging and duplicate removal always run. Rule merging runs unless
 * `rules` is false.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers the resolved browser targets
 * @param {{ rules?: boolean }} [options]
 * @param {Result} [result] the PostCSS result, whose messages the run pushes to
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @return {void}
 */
export declare function mergePass(css: Root, browsers: readonly string[], { rules }?: {
    rules?: boolean;
}, result?: Result, consistencyChecks?: boolean): void;
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
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules' | 'dedupeThenMerge'} name
 * @return {(css: Root, browsers: readonly string[], consistencyChecks?: boolean) => void}
 */
export declare function transformPass(name: 'mergeLonghand' | 'discardDuplicates' | 'mergeRules' | 'dedupeThenMerge'): (css: Root, browsers: readonly string[], consistencyChecks?: boolean) => void;
/**
 * The creator of a pass that runs one transform, so each transform can be
 * tested alone as its own plugin.
 *
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules' | 'dedupeThenMerge'} name
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @return {import('postcss').PluginCreator<object>}
 */
export declare function transformPlugin(name: 'mergeLonghand' | 'discardDuplicates' | 'mergeRules' | 'dedupeThenMerge', consistencyChecks?: boolean): import('postcss').PluginCreator<object>;
//# sourceMappingURL=index.d.ts.map