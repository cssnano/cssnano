import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { RunContext } from '../passes/ir/runContext.js';
import type { DeclarationPlans } from './declarationWalk.js';
import type { LonghandRound } from '../passes/merge/lib/longhand/canonicalize.js';
/**
 * The record walk of a stylesheet, in document order: a container before its
 * children. It applies the declaration and selector plans to each declaration
 * and rule, collects the outermost overridable at-rules, which the discard of
 * discardOverridden compares, and computes the context of each container it
 * enters, after the edits to that container. With the merge's targets, it
 * folds each rule's summaries; with a round, it runs the round on each block
 * after the block's children, then on the root's own declarations.
 *
 * @param {BlockRecords} records the build of the stylesheet
 * @param {RunContext} context the run that built the records; its token lists read the values
 * @param {DeclarationPlans} [plans] what the walk applies to the declarations and rules; none leaves them as built
 * @param {LonghandRound} [round] the first longhand round of the run
 * @param {readonly string[]} [browsers] the targets the merge folds the summaries for; none when the merge is off
 * @return {ArenaIndex[]} the outermost overridable at-rules, in document order
 */
export declare function walkDown(records: BlockRecords, context: RunContext, plans?: DeclarationPlans, round?: LonghandRound, browsers?: readonly string[]): ArenaIndex[];
//# sourceMappingURL=walkDown.d.ts.map