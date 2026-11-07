import type { BlockRecords } from './blockRecords.js';
/**
 * Counts the declarations that the records hold by key: those of each rule that
 * holds no block, and each declaration that is a child of a block. Under
 * consistency checks, throws when a node is reached twice.
 *
 * @param {BlockRecords} records
 * @return {Map<string, number>}
 */
export declare function tallyDeclarations(records: BlockRecords): Map<string, number>;
/**
 * Under consistency checks, throws when the records reach a node twice, or hold
 * a declaration more often than the input wrote it. The sweeps and joins only
 * move and rewrite rules, so no declaration is written again.
 *
 * @param {BlockRecords} records
 * @param {Map<string, number> | null} input the tally of the input, or null when none was taken
 * @return {void}
 */
export declare function assertNoOverDuplication(records: BlockRecords, input: Map<string, number> | null): void;
//# sourceMappingURL=overDuplication.d.ts.map