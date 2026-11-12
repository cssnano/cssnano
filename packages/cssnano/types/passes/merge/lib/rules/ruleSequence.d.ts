import type { ArenaIndex } from './blockRecord.js';
import type { BlockRecords } from './blockRecords.js';
export type Placement = {
    /**
     * the indices of the rules that replace the earlier
     * rule, in its slot
     */
    first: ArenaIndex[];
    /**
     * the indices of the rules that replace the later
     * rule, in its slot
     */
    second: ArenaIndex[];
    /**
     * the indices of the rules that replace each
     * rule after the later one that joined the merge, in its slot
     */
    following?: ArenaIndex[][];
};
/** @import {ArenaIndex, BlockRecord} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/**
 * The rules that stand in the slots of a pair after it is merged.
 *
 * @typedef {object} Placement
 * @property {ArenaIndex[]} first the indices of the rules that replace the earlier
 * rule, in its slot
 * @property {ArenaIndex[]} second the indices of the rules that replace the later
 * rule, in its slot
 * @property {ArenaIndex[][]} [following] the indices of the rules that replace each
 * rule after the later one that joined the merge, in its slot
 */
/**
 * Every rule of a stylesheet in stylesheet order, including rules nested in
 * other rules, rewritten in the block records. The order is two arrays indexed
 * by rule: each rule names the rule before it and the rule after it, with -1 at
 * either end. A rule made during the sweep takes an index past the arrays,
 * which they grow to hold. The methods that edit the records take them as an
 * argument; the sequence keeps no reference to them.
 */
export default class RuleSequence {
    #private;
    /** @type {ArenaIndex | -1} the index of the first rule, -1 when there is none */
    head: ArenaIndex | -1;
    /** @param {BlockRecords} records */
    constructor(records: BlockRecords);
    /**
     * @param {ArenaIndex | -1} index
     * @return {ArenaIndex | -1} the index of the rule after the rule at `index`, -1 at the end
     */
    nextOf(index: ArenaIndex | -1): ArenaIndex | -1;
    /**
     * @param {ArenaIndex | -1} index
     * @return {ArenaIndex | -1} the index of the rule before the rule at `index`, -1 at the start
     */
    prevOf(index: ArenaIndex | -1): ArenaIndex | -1;
    /**
     * Moves the rule at `second` to the end of the parent of the rule at `first`.
     * It follows `first` and holds no nested rules, so passing the rest of that
     * parent leaves the order of the rules unchanged.
     *
     * @param {BlockRecords} records
     * @param {ArenaIndex} first
     * @param {ArenaIndex} second
     * @return {boolean} whether the parents differed
     */
    moveIntoParent(records: BlockRecords, first: ArenaIndex, second: ArenaIndex): boolean;
    /**
     * Replaces the pair at `first` and the rule after it, and the rules after
     * those that joined, with the `placement` rules.
     *
     * @param {BlockRecords} records
     * @param {ArenaIndex} first
     * @param {Placement} placement
     * @return {ArenaIndex | -1} the index of the first replacement
     */
    replacePair(records: BlockRecords, first: ArenaIndex, placement: Placement): ArenaIndex | -1;
}
//# sourceMappingURL=ruleSequence.d.ts.map