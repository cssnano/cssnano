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
 * Under checks, the container that receives `index` must reach the root, and
 * a rule or an at-rule may join only a rule that nests.
 *
 * @param {BlockRecords} records
 * @param {number} block the container that receives the entry
 * @param {number} index the entry that is linked into it
 * @return {void}
 * @throws {Error} under checks, when the link would lose the entry
 */
export declare function assertCanLink(records: BlockRecords, block: number, index: number): void;
/**
 * @param {BlockRecords} records
 * @param {number} block a container
 * @param {number} index the entry linked into it
 * @return {void}
 * @throws {Error} when a rule or an at-rule is linked into a rule that holds no rules
 */
export declare function assertCanHold(records: BlockRecords, block: number, index: number): void;
/**
 * @param {BlockRecords} records
 * @param {number} block
 * @return {void}
 * @throws {Error} when a walk up `parentOf` from `block` does not reach the root
 */
export declare function assertReachesRoot(records: BlockRecords, block: number): void;
//# sourceMappingURL=linkChecks.d.ts.map