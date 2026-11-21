import type { BlockRecords } from './blockRecords.js';
/**
 * The checks of the arena's links. Each one only reads and throws, so the
 * arena calls it under checks and production never runs it.
 */
/**
 * Under checks, walks `parentOf` up from `index` and throws when the walk stops
 * at -1 before the root. An entry linked nowhere is removed, so it throws too.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that the arena gave, or -1
 * @return {void}
 * @throws {Error} under checks, when `index` is not reached by the root
 */
export declare function assertReached(records: BlockRecords, index: number): void;
/**
 * Whether the root reaches an entry: a walk up `parentOf` from it ends at the
 * root, not at -1. A removed entry keeps its subtree, but its parent link is -1.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that the arena gave
 * @return {boolean}
 */
export declare function isReached(records: BlockRecords, index: number): boolean;
/**
 * Under checks, the entry at `index` must stand in no chain, since a second
 * link would leave it in two; the container that receives it must reach the
 * root, and a rule or an at-rule may join only a rule that nests.
 *
 * @param {BlockRecords} records
 * @param {number} block the container that receives the entry
 * @param {number} index the entry that is linked into it
 * @return {void}
 * @throws {Error} under checks, when the link would lose the entry or leave it in two chains
 */
export declare function assertCanLink(records: BlockRecords, block: number, index: number): void;
//# sourceMappingURL=linkChecks.d.ts.map