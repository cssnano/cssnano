import type { CSSToken } from '@csstools/css-tokenizer';
import type { ChildNode, Rule } from 'postcss';
import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { BlockLinks } from './blockLinks.js';
import { BlockRecord } from './blockRecord.js';
import type { NodeEntry } from './blockRecord.js';
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
     * @param {number} index an index that `add` or `recordRule` gave, or -1 for none
     * @return {BlockRecord | RuleRecord | undefined} the container at `index`, a block or a rule,
     * or undefined for -1
     * @throws {Error} under checks, when the entry at `index` is neither
     */
    container(index: number): BlockRecord | RuleRecord | undefined;
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
     * The records of every container the run added that holds children: each
     * block, and each rule that nests. Dropped and departed ones included.
     *
     * @return {Generator<BlockRecord | RuleRecord>}
     */
    containers(): Generator<BlockRecord | RuleRecord>;
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
     * @return {(RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[]}
     */
    liveEntries(index: number): (RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[];
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
     * Clears the edited flag of every rule, once the build has linked their
     * children, so that only edits after the build mark a rule.
     *
     * @return {void}
     */
    settle(): void;
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
     * Adds a bare node, a comment or a statement at-rule, to the arena.
     *
     * @param {NodeEntry} entry
     * @return {NodeEntry}
     */
    bareEntry(entry: NodeEntry): NodeEntry;
    /**
     * Builds the record of a rule and adds it to the arena. The caller links its
     * children, in order, and places the rule. Selector arguments default to the
     * node's.
     *
     * @param {Rule} rule
     * @param {string[]} [selectors]
     * @param {string} [selector]
     * @param {string} [sourceSelector] set only when the source text differs from the selector
     * @param {readonly CSSToken[]} [tokens] the stored tokens of the source text
     * @return {RuleRecord}
     */
    recordRule(rule: Rule, selectors?: string[], selector?: string, sourceSelector?: string, tokens?: readonly CSSToken[]): RuleRecord;
    /**
     * Appends a child to the chain of a rule, after its last child, and gives the
     * child the whitespace of that child when it has none. The node takes it at
     * write-back. The child must be linked nowhere, or unlinked.
     *
     * @param {RuleRecord} rule
     * @param {DeclarationRecord | NodeEntry} child
     * @return {void}
     */
    appendChild(rule: RuleRecord, child: DeclarationRecord | NodeEntry): void;
    /**
     * Removes the declarations of a rule at the positions `claimed`, which index
     * the declarations as they stand at the call. The node drops them at
     * write-back.
     *
     * @param {RuleRecord} rule
     * @param {Set<number>} claimed the positions of the declarations that leave
     * @return {void}
     */
    removeDeclarationsAt(rule: RuleRecord, claimed: Set<number>): void;
    /**
     * Removes the declarations of a rule at the positions `claimed`, as
     * `removeDeclarationsAt` does, and returns their records for another rule to
     * append.
     *
     * @param {RuleRecord} rule
     * @param {Set<number>} claimed the positions of the declarations that leave
     * @return {DeclarationRecord[]} the removed records, in order
     */
    takeDeclarationsAt(rule: RuleRecord, claimed: Set<number>): DeclarationRecord[];
}
//# sourceMappingURL=blockRecords.d.ts.map