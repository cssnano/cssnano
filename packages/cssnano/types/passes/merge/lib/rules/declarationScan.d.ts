import type { BlockRecord } from '../../../ir/blockRecord.js';
import type { RuleRecord } from '../../../ir/ruleRecord.js';
export type Container = BlockRecord | RuleRecord;
import type { BlockRecords } from '../../../ir/blockRecords.js';
/**
 * Walks the stylesheet in the order it will be written to find declarations
 * between two rules.
 */
export default class DeclarationScan {
    #private;
    /**
     * True if a declaration outside both rules lies between them. CSS Nesting
     * keeps a declaration that follows nested rules in source order, so neither
     * rule may move across it. Neighbors hold no rule between them, so any such
     * declaration belongs to an enclosing rule or a block nested in it.
     *
     * The walk follows the chains from `first`, which is the source order the
     * stylesheet will be written in, though rules that moved may differ from
     * the stylesheet. A nested rule's own block is not in a chain, so the walk
     * does not enter it.
     *
     * @param {BlockRecords} records the arena that the blocks of the links index
     * @param {RuleRecord} first
     * @param {RuleRecord} second
     * @return {boolean}
     */
    declarationBetween(records: BlockRecords, first: RuleRecord, second: RuleRecord): boolean;
}
//# sourceMappingURL=declarationScan.d.ts.map