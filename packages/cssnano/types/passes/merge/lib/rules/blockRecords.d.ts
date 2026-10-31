import type { ChildNode, Container, Rule } from 'postcss';
/** @import {ChildNode, Container, Rule} from 'postcss' */
import { RuleRecord } from './ruleRecord.js';
/**
 * One position among the children of a block. `rules` are the rules that
 * stand there now, in order, so the slot is empty once every rule left.
 */
export declare class Slot {
    /** @type {BlockRecord} the block the slot stands in */
    block: BlockRecord;
    /** @type {number} where the slot stands among the children of `block` */
    position: number;
    /** @type {RuleRecord[]} */
    rules: RuleRecord[];
    /**
     * @param {BlockRecord} block
     * @param {number} position
     * @param {RuleRecord[]} rules
     */
    constructor(block: BlockRecord, position: number, rules: RuleRecord[]);
    /**
     * Replaces `record` in the slot with `replacements`, and places each of them
     * here.
     *
     * @param {RuleRecord} record the record that stands in the slot and is replaced
     * @param {RuleRecord[]} replacements
     * @return {void}
     */
    substitute(record: RuleRecord, replacements: RuleRecord[]): void;
}
/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. `children` has one
 * entry per child, in order: a slot for a rule, the record of a nested
 * at-rule, or the PostCSS node of anything else. Entries are never spliced
 * out, so a removed entry is left in place and skipped.
 */
export declare class BlockRecord {
    #private;
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
     * block is not tracked. Dropping an emptied `@layer` is safe because a rule
     * moves only into an equivalent earlier block, which already orders the
     * layer. A block empty at sweep start is untracked because it may be the
     * first statement that orders its layer.
     *
     * @type {number | null}
     */
    remaining: number | null;
    /** @type {boolean} whether a sweep removed the block for being empty */
    dropped: boolean;
    /**
     * The whitespace before the first child of the stylesheet, which PostCSS
     * hands on when that child is removed. Only the record of the stylesheet
     * holds it.
     *
     * @type {string | undefined}
     */
    leadingWhitespace: string | undefined;
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
     * Accounts for the block gaining `change` live children, or losing them when
     * negative. A droppable block that is tracked and goes empty tells its
     * parent, which may go empty in turn.
     *
     * @param {number} change
     * @return {void}
     */
    changed(change: number): void;
    /**
     * The entries the block holds now, in order: the record of each rule, the
     * record of each at-rule block, and the node of anything else. A block that
     * was dropped is left out.
     *
     * @return {(RuleRecord | BlockRecord | ChildNode)[]}
     */
    liveEntries(): (RuleRecord | BlockRecord | ChildNode)[];
    /**
     * The children the block holds now, in order: the rules of its slots, and
     * the nodes of its other entries, except a block that was dropped.
     *
     * @return {ChildNode[]}
     */
    liveChildren(): ChildNode[];
    /**
     * Moves `record` out of `from` into a new slot after the last child of this
     * block.
     *
     * @param {RuleRecord} record
     * @param {Slot} from
     * @return {Slot} the slot that now holds `record`
     */
    moveRule(record: RuleRecord, from: Slot): Slot;
    /**
     * Takes the children of `source` after its own. Each rule gets a slot here,
     * and each block a rule holds gets this block as its parent. `source` is
     * left with no children, since the caller removes it.
     *
     * @param {BlockRecord} source
     * @return {void}
     */
    adopt(source: BlockRecord): void;
}
/**
 * The records of one run: the block of each container, and the rule records
 * the run keeps in step with the tree.
 */
export declare class BlockRecords {
    #private;
    /** @type {BlockRecord} the record of the stylesheet */
    root: BlockRecord;
    /** @type {Map<string, number> | null} declarations the input wrote, under checks */
    inputWrites: Map<string, number> | null;
    /**
     * The most rounds a run may take before it throws. Set from the counts of
     * rules, at-rules and declarations when the records are built.
     *
     * @type {number}
     */
    maxRounds: number;
    /** @param {BlockRecord} root the record of the stylesheet */
    constructor(root: BlockRecord);
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
     * The records of every block the run added, dropped ones included.
     *
     * @return {IterableIterator<BlockRecord>}
     */
    blocks(): IterableIterator<BlockRecord>;
    /**
     * Gives a rule its record, built from its current declarations.
     *
     * @param {Rule} rule
     * @return {RuleRecord}
     */
    recordRule(rule: Rule): RuleRecord;
    /**
     * The entry a live child of a block stands as: the record of a rule, the
     * record of an at-rule with a block, or the node itself.
     *
     * @param {ChildNode} node
     * @return {RuleRecord | BlockRecord | ChildNode}
     */
    entryOf(node: ChildNode): RuleRecord | BlockRecord | ChildNode;
    /** @param {Rule} rule @return {RuleRecord | undefined} */
    recordOf(rule: Rule): RuleRecord | undefined;
    /**
     * @param {Rule} rule
     * @return {RuleRecord}
     * @throws {Error} when the rule has no record
     */
    metaOf(rule: Rule): RuleRecord;
}
//# sourceMappingURL=blockRecords.d.ts.map