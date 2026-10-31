import type { ChildNode, Rule } from 'postcss';
import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { RuleRecord } from './ruleRecord.js';
import type { BlockRecord } from './blockRecord.js';
/** @import {BlockRecord} from './blockRecord.js' */
/**
 * One position among the children of a block. `rules` are the indices of the
 * rules that stand there now, in order, so the slot is empty once every rule
 * left.
 */
export declare class Slot {
    /** @type {number} the index of the block the slot stands in */
    block: number;
    /** @type {number} where the slot stands among the children of `block` */
    position: number;
    /** @type {number[]} the indices of the rules in the slot */
    rules: number[];
    /**
     * @param {number} block the index of the block the slot stands in
     * @param {number} position
     * @param {number[]} rules
     */
    constructor(block: number, position: number, rules: number[]);
}
/**
 * The records of one run: the stylesheet's block, and every block record the
 * run added, and every rule record recorded. A block names its parent and a
 * rule names its slot by index, so every edit that touches more than one
 * record is a method here.
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
     * @return {number} the rule records recorded so far, departed ones included
     */
    ruleCount(): number;
    /**
     * The records of every block the run added, dropped ones included.
     *
     * @return {IterableIterator<BlockRecord>}
     */
    blocks(): IterableIterator<BlockRecord>;
    /**
     * The slot a placed rule stands in.
     *
     * @param {RuleRecord} record
     * @return {Slot}
     */
    slotOf(record: RuleRecord): Slot;
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
     * The first child the block at `index` holds now, without copying the child
     * list.
     *
     * @param {number} index
     * @return {ChildNode | undefined}
     */
    firstLiveChild(index: number): ChildNode | undefined;
    /**
     * The number of children the block at `index` holds now, counted without
     * copying them.
     *
     * @param {number} index
     * @return {number}
     */
    liveCount(index: number): number;
    /**
     * The entries the block at `index` holds now, in order: the record of each
     * rule, the record of each at-rule block, and the node of anything else. A
     * block that was dropped is left out.
     *
     * @param {number} index
     * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
     */
    liveEntries(index: number): (RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[];
    /**
     * The children the block at `index` holds now, in order: the rules of its
     * slots, and the nodes of its other entries, except a block that was dropped.
     *
     * @param {number} index
     * @return {ChildNode[]}
     */
    liveChildren(index: number): ChildNode[];
    /**
     * Replaces the rule `record` in `slot` with the rules `replacements`, and
     * places each of them in the slot.
     *
     * @param {Slot} slot the slot that holds `record` and is given the replacements
     * @param {number} record the index of the rule that stands in the slot and is replaced
     * @param {number[]} replacements
     * @return {void}
     */
    substitute(slot: Slot, record: number, replacements: number[]): void;
    /**
     * Moves the rule `record` out of its slot into a new slot after the last
     * child of the block at `target`.
     *
     * @param {number} target the index of the block that takes the rule
     * @param {number} record the index of the rule
     * @return {Slot} the slot that now holds the rule
     */
    moveRule(target: number, record: number): Slot;
    /**
     * Takes the children of the block at `source` after those of the block at
     * `target`. Each rule gets a slot in `target`, and each block a rule holds
     * gets `target` as its parent. `source` is left with no children, since the
     * caller removes it.
     *
     * @param {number} target
     * @param {number} source
     * @return {void}
     */
    adopt(target: number, source: number): void;
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