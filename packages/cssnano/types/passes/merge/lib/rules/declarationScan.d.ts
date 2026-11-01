import type { RuleRecord } from './ruleRecord.js';
import type { BlockRecords } from './blockRecords.js';
/**
 * Walks the stylesheet in the order it will be written to find declarations
 * between two rules.
 */
export default class DeclarationScan {
    #private;
    /** @param {BlockRecords} records the arena that the blocks of the links index */
    constructor(records: BlockRecords);
    /**
     * True if a declaration outside both rules lies between them. CSS Nesting
     * keeps a declaration that follows nested rules in source order, so neither
     * rule may move across it. Neighbors hold no rule between them, so any such
     * declaration belongs to an enclosing rule or a block nested in it.
     *
     * The walk follows source order as the stylesheet will be written, which
     * differs from the stylesheet for rules that moved, and is short because it
     * starts at `first`.
     *
     * @param {RuleRecord} first
     * @param {RuleRecord} second
     * @param {Map<number, boolean>} outsideDeclarations whether a rule has
     * a declaration outside its nested rules, valid for the whole scan: rewrites
     * move declarations between rules but never create one outside them
     * @return {boolean}
     */
    declarationBetween(first: RuleRecord, second: RuleRecord, outsideDeclarations: Map<number, boolean>): boolean;
}
//# sourceMappingURL=declarationScan.d.ts.map