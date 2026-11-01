import type { ChildNode, Rule } from 'postcss';
import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { BlockLinks } from './blockLinks.js';
import { BlockRecord, NodeEntry } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';
/**
 * The records of one run. One arena holds every block record, every rule record,
 * every declaration of a block and every bare node of a block, each at the next
 * index of one counter; an index is never reused within a run. A block's
 * children are the entries its chain links, and a rule's own declarations stay
 * in its record. Ownership is a tree, so an edit that touches more than one
 * record is a method here.
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
     * @return {BlockRecord | undefined} undefined for -1
     * @throws {Error} under checks, when the entry at `index` is not a block
     */
    block(index: number): BlockRecord | undefined;
    /**
     * @param {number} index an index that the arena gave
     * @return {BlockRecord | undefined} the block at `index`, or undefined when the entry is another kind
     */
    blockEntry(index: number): BlockRecord | undefined;
    /**
     * @param {number} index an index that the arena gave
     * @return {boolean} whether a sweep dropped the block at `index`, which leaves the tree
     */
    isDropped(index: number): boolean;
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
     * The PostCSS node of the entry at `index`, which is a rule, a block, a
     * declaration or a bare node.
     *
     * @param {number} index
     * @return {ChildNode}
     */
    nodeOf(index: number): ChildNode;
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
     * Replaces the rule `record` with the rules `replacements`, which take its
     * place in the chain, in order.
     *
     * @param {number} record the index of the rule that is replaced
     * @param {number[]} replacements
     * @return {void}
     */
    substitute(record: number, replacements: number[]): void;
    /**
     * Moves the rule `record` to the end of the chain of the block at `target`.
     *
     * @param {number} target the index of the block that takes the rule
     * @param {number} record the index of the rule
     * @return {void}
     */
    moveRule(target: number, record: number): void;
    /**
     * Moves the chain of the block at `source` to the end of the chain of the
     * block at `target`. `source` is left with no children, since the caller
     * removes it. A nested block keeps its rule, which moves with the chain.
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