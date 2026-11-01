import { RuleRecord } from './ruleRecord.js';
import type { BlockRecords } from './blockRecords.js';
export type Placement = {
    /**
     * the indices of the rules that replace the earlier
     * rule, in its slot
     */
    first: number[];
    /**
     * the indices of the rules that replace the later
     * rule, in its slot
     */
    second: number[];
    /**
     * the indices of the rules that replace each
     * rule after the later one that joined the merge, in its slot
     */
    following?: number[][];
};
/** @import {BlockRecords, Slot} from './blockRecords.js' */
/**
 * The rules that stand in the slots of a pair after it is merged.
 *
 * @typedef {object} Placement
 * @property {number[]} first the indices of the rules that replace the earlier
 * rule, in its slot
 * @property {number[]} second the indices of the rules that replace the later
 * rule, in its slot
 * @property {number[][]} [following] the indices of the rules that replace each
 * rule after the later one that joined the merge, in its slot
 */
/**
 * Every rule of a stylesheet in stylesheet order, including rules nested in
 * other rules, rewritten in the block records. The order is two arrays indexed
 * by rule: each rule names the rule before it and the rule after it, with -1 at
 * either end. A rule made during the sweep takes an index past the arrays,
 * which they grow to hold.
 */
export default class RuleSequence {
    #private;
    /** @type {number} the index of the first rule, -1 when there is none */
    head: number;
    /** @param {BlockRecords} records */
    constructor(records: BlockRecords);
    /**
     * @param {number} index
     * @return {number} the index of the rule after the rule at `index`, -1 at the end
     */
    nextOf(index: number): number;
    /**
     * @param {number} index
     * @return {number} the index of the rule before the rule at `index`, -1 at the start
     */
    prevOf(index: number): number;
    /**
     * @param {RuleRecord} first
     * @param {RuleRecord} second
     * @param {Map<number, boolean>} outsideDeclarations see
     * `DeclarationScan#declarationBetween`
     * @return {boolean} whether a declaration outside both rules lies between them
     */
    declarationBetween(first: RuleRecord, second: RuleRecord, outsideDeclarations: Map<number, boolean>): boolean;
    /**
     * Moves the rule at `second` to the end of the parent of the rule at `first`.
     * It follows `first` and holds no nested rules, so passing the rest of that
     * parent leaves the order of the rules unchanged.
     *
     * @param {number} first
     * @param {number} second
     * @return {boolean} whether the parents differed
     */
    moveIntoParent(first: number, second: number): boolean;
    /**
     * Replaces the pair at `first` and the rule after it, and the rules after
     * those that joined, with the `placement` rules.
     *
     * @param {number} first
     * @param {Placement} placement
     * @return {number} the index of the first replacement
     */
    replacePair(first: number, placement: Placement): number;
}
//# sourceMappingURL=ruleSequence.d.ts.map