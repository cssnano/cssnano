import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { RunContext } from '../passes/ir/runContext.js';
/**
 * The record walk of a stylesheet, in document order: a container before its
 * children. It collects the outermost overridable at-rules, which the discard
 * of discardOverridden compares, and computes the context of each container
 * it enters.
 *
 * @param {BlockRecords} records the build of the stylesheet
 * @param {RunContext} context the run that built the records; its token lists read the values
 * @return {ArenaIndex[]} the outermost overridable at-rules, in document order
 */
export declare function walkDown(records: BlockRecords, context: RunContext): ArenaIndex[];
//# sourceMappingURL=walkDown.d.ts.map