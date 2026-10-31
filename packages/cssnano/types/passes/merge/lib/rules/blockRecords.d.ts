import type { ChildNode, Container, Rule } from 'postcss';
import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { RuleRecord } from './ruleRecord.js';
/**
 * One position among the children of a block. `rules` are the rules that
 * stand there now, in order, so the slot is empty once every rule left.
 */
export declare class Slot {
    /** @type {number} the index of the block the slot stands in */
    block: number;
    /** @type {number} where the slot stands among the children of `block` */
    position: number;
    /** @type {RuleRecord[]} */
    rules: RuleRecord[];
    /**
     * @param {number} block the index of the block the slot stands in
     * @param {number} position
     * @param {RuleRecord[]} rules
     */
    constructor(block: number, position: number, rules: RuleRecord[]);
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
    /** @type {number} the index of the block whose children hold this one's entry, -1 for the stylesheet */
    parent: number;
    /** @type {number} where the entry stands among the children of `parent` */
    position: number;
    /** @type {boolean} whether the block applies nothing once it is empty */
    droppable: boolean;
    /** @type {(Slot | BlockRecord | DeclarationRecord | ChildNode)[]} */
    children: (Slot | BlockRecord | DeclarationRecord | ChildNode)[];
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
    /** @type {number} the place of the block in the arena of its records, -1 until added */
    index: number;
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
     * @param {number} parent the index of the block whose children hold this one's entry, -1 for the stylesheet
     * @param {number} position
     * @param {boolean} droppable
     */
    constructor(node: Container, parent: number, position: number, droppable: boolean);
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
     * The entries the block holds now, in order: the record of each rule, the
     * record of each at-rule block, and the node of anything else. A block that
     * was dropped is left out.
     *
     * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
     */
    liveEntries(): (RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[];
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
 * The records of one run: the stylesheet's block, and every block record the
 * run added. Rule records are reached through the slots that hold them.
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
    /**
     * @param {BlockRecord} root the record of the stylesheet
     */
    constructor(root: BlockRecord);
    /**
     * Adds a block record to the arena, which gives it the next index.
     *
     * @param {BlockRecord} block
     * @return {void}
     */
    add(block: BlockRecord): void;
    /**
     * @param {number} index an index that `add` gave, or -1 for no block
     * @return {BlockRecord | undefined}
     */
    block(index: number): BlockRecord | undefined;
    /**
     * @param {number} index an index that `recordRule` gave
     * @return {RuleRecord | undefined}
     */
    rule(index: number): RuleRecord | undefined;
    /**
     * The records of every block the run added, dropped ones included.
     *
     * @return {IterableIterator<BlockRecord>}
     */
    blocks(): IterableIterator<BlockRecord>;
    /**
     * Accounts for the block at `index` gaining `change` live children, or losing
     * them when negative. A droppable block that is tracked and goes empty tells
     * its parent, which may go empty in turn.
     *
     * @param {number} index
     * @param {number} change
     * @return {void}
     */
    changed(index: number, change: number): void;
    /**
     * Builds the record of a declaration that is a child of a block.
     *
     * @param {import('postcss').Declaration} node
     * @param {PropertyTable} properties the keys of the property names
     * @param {DeclarationKeys} declarations the ids of the declarations
     * @return {DeclarationRecord}
     */
    declarationRecord(node: import('postcss').Declaration, properties: PropertyTable, declarations: DeclarationKeys): DeclarationRecord;
    /**
     * Builds the record of a rule and adds it to the arena, which gives it the
     * next index. The slot the caller places it in is what holds it.
     *
     * @param {Rule} rule
     * @param {PropertyTable} properties the keys of the property names
     * @param {DeclarationKeys} declarations the ids of the declarations
     * @param {DeclarationRecord[] | null} [records] the records of the rule's
     * declarations, in order, when the caller holds them already, such as the
     * records a rule hands to a new rule; null to record each declaration of the
     * rule
     * @return {RuleRecord}
     */
    recordRule(rule: Rule, properties: PropertyTable, declarations: DeclarationKeys, records?: DeclarationRecord[] | null): RuleRecord;
}
//# sourceMappingURL=blockRecords.d.ts.map