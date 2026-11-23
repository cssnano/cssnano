import { LonghandRound } from './longhand/canonicalize.js';
import { targetSupportOf } from './longhand/targetSupport.js';
import { isBoolean } from '../optionGuards.js';
import type { BlockRecords } from '../ir/blockRecords.js';
import type { RunContext } from '../run/runContext.js';
export type RecordTransform = (records: BlockRecords, browsers: readonly string[], context: RunContext) => void;
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
/** The guard for the `rules` option, shared with the preset that validates it. */
export declare const rulesGuard: Readonly<{
    isValid: typeof isBoolean;
    expected: "a boolean";
}>;
//# sourceMappingURL=index.d.ts.map