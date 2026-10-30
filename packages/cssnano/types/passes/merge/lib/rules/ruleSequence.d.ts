import { BlockRecord, Slot } from './blockRecords.js';
import type { Rule } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
export type RuleLink = {
    rule: Rule;
    slot: Slot;
    prev: RuleLink | null;
    next: RuleLink | null;
};
export type Placement = {
    /**
     * replaces the earlier rule, in its slot
     */
    first: Rule[];
    /**
     * replaces the later rule, in its slot
     */
    second: Rule[];
    /**
     * replaces each rule after the later one that
     * joined the merge, in its slot
     */
    following?: Rule[][];
};
/**
 * Every rule of a stylesheet in stylesheet order, including rules nested in
 * other rules, rewritten in the block records.
 */
export default class RuleSequence {
    #private;
    /** @type {RuleLink} a sentinel that precedes the first rule */
    head: RuleLink;
    /** @param {BlockRecords} records */
    constructor(records: BlockRecords);
    /**
     * @param {RuleLink} first
     * @param {RuleLink} second
     * @param {WeakMap<BlockRecord, boolean>} outsideDeclarations see
     * `DeclarationScan#declarationBetween`
     * @return {boolean} whether a declaration outside both rules lies between them
     */
    declarationBetween(first: RuleLink, second: RuleLink, outsideDeclarations: WeakMap<BlockRecord, boolean>): boolean;
    /**
     * Moves the rule of `second` to the end of the parent of `first`. It follows
     * `first` and holds no nested rules, so passing the rest of that parent
     * leaves the order of the rules unchanged.
     *
     * @param {RuleLink} first
     * @param {RuleLink} second
     * @return {boolean} whether the parents differed
     */
    moveIntoParent(first: RuleLink, second: RuleLink): boolean;
    /**
     * Replaces the pair `first` and the link after it, and the links after
     * those that joined, with the `placement` rules.
     *
     * @param {RuleLink} first
     * @param {Placement} placement
     * @return {RuleLink} the link of the first replacement
     */
    replacePair(first: RuleLink, placement: Placement): RuleLink;
    /**
     * Ends the sweep: drops the blocks it emptied. The stylesheet is not touched;
     * `runMerge` writes the records back once.
     *
     * @return {void}
     */
    finish(): void;
}
//# sourceMappingURL=ruleSequence.d.ts.map