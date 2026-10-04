/** @import {Rule} from 'postcss' */
/** @import {Slot} from './slotIndex.js' */
import type { Rule } from 'postcss';
import type { Slot } from './slotIndex.js';
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
};
/**
 * A doubly linked list lets the scan replace a merged pair in constant time.
 *
 * @typedef {{rule: Rule, slot: Slot, prev: RuleLink | null, next: RuleLink | null}} RuleLink
 */
/**
 * The rules that stand in the slots of a pair after it is merged.
 *
 * @typedef {object} Placement
 * @property {Rule[]} first replaces the earlier rule, in its slot
 * @property {Rule[]} second replaces the later rule, in its slot
 */
export {};
//# sourceMappingURL=rule-sequence-types.d.ts.map