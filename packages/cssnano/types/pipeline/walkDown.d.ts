import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
/**
 * The record walk of a stylesheet, in document order: a container before its
 * children. In this step it collects the outermost overridable at-rules, which
 * the discard of discardOverridden compares.
 *
 * @param {BlockRecords} records the build of the stylesheet, after the node walk
 * @return {ArenaIndex[]} the outermost overridable at-rules, in document order
 */
export declare function walkDown(records: BlockRecords): ArenaIndex[];
//# sourceMappingURL=walkDown.d.ts.map