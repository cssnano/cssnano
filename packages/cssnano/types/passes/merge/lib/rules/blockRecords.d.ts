/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import MergeState from './mergeState.js' */
import type { ChildNode, Container, Rule } from 'postcss';
import type MergeState from './mergeState.js';
/**
 * One position among the children of a block. `rules` are the rules that
 * stand there now, in order, so the slot is empty once every rule left.
 */
export declare class Slot {
    /** @type {BlockRecord} the block the slot stands in */
    block: BlockRecord;
    /** @type {number} where the slot stands among the children of `block` */
    position: number;
    /** @type {Rule[]} */
    rules: Rule[];
    /**
     * @param {BlockRecord} block
     * @param {number} position
     * @param {Rule[]} rules
     */
    constructor(block: BlockRecord, position: number, rules: Rule[]);
    /**
     * Replaces `rule` in the slot with `replacements`, and places each of them
     * here.
     *
     * @param {Rule} rule the rule that stands in the slot and is replaced
     * @param {Rule[]} replacements
     * @param {BlockRecords} records
     * @return {void}
     */
    substitute(rule: Rule, replacements: Rule[], records: BlockRecords): void;
}
/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. `children` has one
 * entry per child, in order: a slot for a rule, the record of a nested
 * at-rule, or the PostCSS node of anything else. Entries are never spliced
 * out, so a removed entry is left in place and skipped.
 */
export declare class BlockRecord {
    /** @type {Container} */
    node: Container;
    /** @type {BlockRecord | null} the block whose children hold this one's entry */
    parent: BlockRecord | null;
    /** @type {number} where the entry stands among the children of `parent` */
    position: number;
    /** @type {boolean} whether the block applies nothing once it is empty */
    droppable: boolean;
    /** @type {(Slot | BlockRecord | ChildNode)[]} */
    children: (Slot | BlockRecord | ChildNode)[];
    /**
     * The live children of a droppable block during a sweep, or null while the
     * block is not tracked.
     *
     * @type {number | null}
     */
    remaining: number | null;
    /** @type {boolean} whether a sweep removed the block for being empty */
    dropped: boolean;
    /**
     * @param {Container} node
     * @param {BlockRecord | null} parent
     * @param {number} position
     * @param {boolean} droppable
     */
    constructor(node: Container, parent: BlockRecord | null, position: number, droppable: boolean);
    /**
     * The first child the block holds now, without copying the child list.
     *
     * @return {ChildNode | undefined}
     */
    firstLiveChild(): ChildNode | undefined;
    /**
     * The number of children the block holds now, counted without copying them.
     *
     * @return {number}
     */
    liveCount(): number;
    /**
     * The children the block holds now, in order: the rules of its slots, and
     * the nodes of its other entries, except a block that was dropped.
     *
     * @return {ChildNode[]}
     */
    liveChildren(): ChildNode[];
    /**
     * Moves `rule` out of `from` into a new slot after the last child of this
     * block.
     *
     * @param {Rule} rule
     * @param {Slot} from
     * @param {BlockRecords} records
     * @return {Slot} the slot that now holds `rule`
     */
    moveRule(rule: Rule, from: Slot, records: BlockRecords): Slot;
    /**
     * Takes the children of `source` after its own. Each rule gets a slot here,
     * and each block a rule holds gets this block as its parent. `source` is
     * left with no children, since the caller removes it.
     *
     * @param {BlockRecord} source
     * @param {BlockRecords} records
     * @return {void}
     */
    adopt(source: BlockRecord, records: BlockRecords): void;
}
/**
 * @param {Rule} rule
 * @return {number} the declarations the rule holds, without copying them
 */
export declare function countDeclarations(rule: Rule): number;
/**
 * The records of one run: the block of each container, and the rule records
 * the run keeps in step with the tree.
 */
export declare class BlockRecords {
    #private;
    /** @type {BlockRecord} the record of the stylesheet */
    root: BlockRecord;
    /**
     * The most rounds a run may take before it throws. Set from the counts of
     * rules, at-rules and declarations when the records are built.
     *
     * @type {number}
     */
    maxRounds: number;
    /**
     * @param {MergeState} mergeState
     * @param {BlockRecord} root the record of the stylesheet
     */
    constructor(mergeState: MergeState, root: BlockRecord);
    /**
     * @param {BlockRecord} block
     * @return {void}
     */
    add(block: BlockRecord): void;
    /**
     * @param {Container} node
     * @return {BlockRecord | undefined} the record of a container, if it has one
     */
    blockOf(node: Container): BlockRecord | undefined;
    /**
     * @param {Rule} rule
     * @return {import('./ruleMeta.js').RuleMeta} the record of the rule
     */
    metaOf(rule: Rule): import('./ruleMeta.js').RuleMeta;
}
//# sourceMappingURL=blockRecords.d.ts.map