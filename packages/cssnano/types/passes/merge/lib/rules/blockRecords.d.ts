import type { ChildNode, Rule } from 'postcss';
import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { BlockLinks } from './blockLinks.js';
import { BlockRecord, NodeEntry, Slot } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';
export { Slot } from './blockRecord.js';
/**
 * The records of one run. One arena holds every block record, every rule record,
 * every declaration of a block and every bare node of a block, each at the next
 * index of one counter; an index is never reused within a run. A block's children
 * are slots and arena indices, and a rule's own declarations stay in its record.
 * Ownership is a tree, so an edit that touches more than one record is a method
 * here.
 */
export declare class BlockRecords {
    #private;
    /** @type {BlockRecord} the record of the stylesheet */
    root: BlockRecord;
    /** @type {BlockLinks} the chains of the blocks, and each entry's container */
    links: BlockLinks;
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
     * @param {number} index an index that the arena gave
     * @return {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry}
     */
    entry(index: number): BlockRecord | RuleRecord | DeclarationRecord | NodeEntry;
    /**
     * @param {number} index an index that `add` gave, or -1 for no block
     * @return {BlockRecord | undefined}
     */
    block(index: number): BlockRecord | undefined;
    /**
     * @param {number} index an index that the arena gave
     * @return {BlockRecord | undefined} the block at `index`, or undefined when the entry is another kind
     */
    blockEntry(index: number): BlockRecord | undefined;
    /**
     * @param {number} index an index that `recordRule` gave
     * @return {RuleRecord | undefined}
     */
    rule(index: number): RuleRecord | undefined;
    /**
     * @return {number} the entries the arena holds, dropped and departed ones included
     */
    entryCount(): number;
    /**
     * The records of every block the run added, dropped ones included.
     *
     * @return {Generator<BlockRecord>}
     */
    blocks(): Generator<BlockRecord>;
    /**
     * The slot a placed rule stands in.
     *
     * @param {RuleRecord} record
     * @return {Slot}
     */
    slotOf(record: RuleRecord): Slot;
    /**
     * The PostCSS node of the entry at `index`, which is a block, a declaration or
     * a bare node.
     *
     * @param {number} index
     * @return {ChildNode}
     */
    nodeOf(index: number): ChildNode;
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
     * The first live child of the block at `index`; see `blockChildren.js`.
     *
     * @param {number} index
     * @return {ChildNode | undefined}
     */
    firstLiveChild(index: number): ChildNode | undefined;
    /**
     * The live children of the block at `index`, counted; see `blockChildren.js`.
     *
     * @param {number} index
     * @return {number}
     */
    liveCount(index: number): number;
    /**
     * The live entries of the block at `index`; see `blockChildren.js`.
     *
     * @param {number} index
     * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
     */
    liveEntries(index: number): (RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[];
    /**
     * The live children of the block at `index`; see `blockChildren.js`.
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
     * Builds the record of a declaration that is a rule's child.
     *
     * @param {import('postcss').Declaration} node
     * @param {PropertyTable} properties the keys of the property names
     * @param {DeclarationKeys} declarations the ids of the declarations
     * @return {DeclarationRecord}
     */
    declarationRecord(node: import('postcss').Declaration, properties: PropertyTable, declarations: DeclarationKeys): DeclarationRecord;
    /**
     * Builds the record of a declaration that is a child of a block and adds it
     * to the arena, which gives it the next index.
     *
     * @param {import('postcss').Declaration} node
     * @param {PropertyTable} properties the keys of the property names
     * @param {DeclarationKeys} declarations the ids of the declarations
     * @return {DeclarationRecord}
     */
    blockDeclaration(node: import('postcss').Declaration, properties: PropertyTable, declarations: DeclarationKeys): DeclarationRecord;
    /**
     * Adds a bare node of a block, a comment or a statement at-rule, to the
     * arena, which gives it the next index.
     *
     * @param {ChildNode} node
     * @return {NodeEntry}
     */
    bareEntry(node: ChildNode): NodeEntry;
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