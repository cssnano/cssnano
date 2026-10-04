/** @import {ChildNode, Container, Rule} from 'postcss' */
import type { ChildNode, Container, Rule } from 'postcss';
export type Slot = {
    parent: Container;
    /**
     * where the slot stands among `parent.nodes`, or
     * after the last child when a rule moved into `parent` created it
     */
    index: number;
    /**
     * in stylesheet order, none once its rule left
     */
    rules: Rule[];
};
export type SlotReader = Pick<SlotIndex, 'slotAt' | 'length' | 'positionOf' | 'childrenOf'>;
/**
 * The scan decides merges on a sequence of rules and writes the stylesheet
 * once per sweep. Everything that is not a rule it can rewrite keeps its
 * place while it decides: containers, declarations of enclosing rules,
 * comments. Each rule stands in a slot, a position among the children of one
 * container, and a merge only changes which rules stand in the slots of the
 * pair it replaces. A node between the pair therefore stays between the
 * replacements. Splicing the children of a container after every merge would
 * take quadratic time.
 *
 * @typedef {object} Slot
 * @property {Container} parent
 * @property {number} index where the slot stands among `parent.nodes`, or
 * after the last child when a rule moved into `parent` created it
 * @property {Rule[]} rules in stylesheet order, none once its rule left
 */
/**
 * What collaborators may use: they look slots up but cannot move rules.
 *
 * @typedef {Pick<SlotIndex, 'slotAt' | 'length' | 'positionOf' | 'childrenOf'>} SlotReader
 */
/**
 * Where each rule of the stylesheet stands, as the sweep started, and which
 * slots rules moved into.
 */
export default class SlotIndex {
    #private;
    /**
     * @param {Container} container
     * @param {number} index
     * @param {Rule} rule
     * @return {Slot}
     */
    register(container: Container, index: number, rule: Rule): Slot;
    /**
     * @param {Container} container
     * @param {number} index
     */
    recordPosition(container: Container, index: number): void;
    /**
     * @param {Container} container
     * @return {number}
     */
    positionOf(container: Container): number;
    /**
     * @param {Container} container
     * @param {number} index
     * @return {Slot | undefined} the slot standing at `index` among the children
     * of `container`, where the slots of moved rules follow the last child
     */
    slotAt(container: Container, index: number): Slot | undefined;
    /**
     * @param {Container} container
     * @return {number} the children of `container` plus the slots moved into it
     */
    length(container: Container): number;
    /**
     * @param {Container} container
     * @param {(node: ChildNode) => boolean} keepsNode whether a child that holds
     * no slot is written
     * @return {ChildNode[]} the children `container` has now, in order
     */
    childrenOf(container: Container, keepsNode: (node: ChildNode) => boolean): ChildNode[];
    /**
     * Moves `rule` out of `from` into a new slot after the last child of
     * `target`.
     *
     * @param {Rule} rule
     * @param {Slot} from
     * @param {Container} target
     * @return {Slot} the slot that now holds `rule`
     */
    moveRule(rule: Rule, from: Slot, target: Container): Slot;
    /**
     * @param {Slot} slot
     * @param {Rule} rule the rule that stands in `slot` and is replaced
     * @param {Rule[]} replacements
     */
    substitute(slot: Slot, rule: Rule, replacements: Rule[]): void;
}
//# sourceMappingURL=slotIndex.d.ts.map