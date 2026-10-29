import { BlockRecord, Slot } from './blockRecords.js';
import type { ChildNode, Rule } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
/** @import {ChildNode, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/**
 * Moves and replaces rules in the slots of the block records. The records keep
 * the only state; this class holds a reference to them.
 */
export default class SlotIndex {
    #private;
    /** @param {BlockRecords} records */
    constructor(records: BlockRecords);
    /**
     * The nodes a block holds now, in order: the rules of its slots, and the
     * nodes of its other entries, except a block that was dropped.
     *
     * @param {BlockRecord} block
     * @return {(Rule | ChildNode)[]}
     */
    childrenOf(block: BlockRecord): (Rule | ChildNode)[];
    /**
     * Moves `rule` out of `from` into a new slot after the last child of
     * `target`.
     *
     * @param {Rule} rule
     * @param {Slot} from
     * @param {BlockRecord} target
     * @return {Slot} the slot that now holds `rule`
     */
    moveRule(rule: Rule, from: Slot, target: BlockRecord): Slot;
    /**
     * @param {Slot} slot
     * @param {Rule} rule the rule that stands in `slot` and is replaced
     * @param {Rule[]} replacements
     */
    substitute(slot: Slot, rule: Rule, replacements: Rule[]): void;
}
//# sourceMappingURL=slotIndex.d.ts.map