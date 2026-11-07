import type { CSSToken } from '@csstools/css-tokenizer';
import type { ChildNode, Rule } from 'postcss';
import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { BlockRecord } from './blockRecord.js';
import type { NodeEntry } from './blockRecord.js';
import type { ArenaIndex } from './blockRecord.js';
import type { LinkReader } from './blockLinks.js';
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
    /** @type {LinkReader} the chains of the blocks, read here and edited through this arena */
    links: LinkReader;
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
     * @param {ArenaIndex} index an index that the arena gave
     * @return {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry}
     */
    entry(index: ArenaIndex): BlockRecord | RuleRecord | DeclarationRecord | NodeEntry;
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
     * @param {number} index an index that `recordRule` gave; under checks, throws when the root does not reach it
     */
    rule(index: number): RuleRecord | undefined;
    /**
     * The container whose chain holds the entry at `index`.
     *
     * @param {number} index an index that the arena gave
     * @return {BlockRecord | RuleRecord | undefined} undefined when the entry is linked nowhere
     */
    enclosingContainer(index: number): BlockRecord | RuleRecord | undefined;
    /**
     * @param {number} index an index that the arena gave, of a container
     * @return {DeclarationRecord | undefined} the first declaration of its chain
     */
    firstDeclaration(index: number): DeclarationRecord | undefined;
    /**
     * @param {DeclarationRecord} declaration a declaration linked in a chain
     * @return {DeclarationRecord | undefined} the declaration after it in its chain
     * @throws {Error} under checks, when the declaration is linked nowhere
     */
    nextDeclaration(declaration: DeclarationRecord): DeclarationRecord | undefined;
    /**
     * Links the entry at `index` after `after` in the chain of the container at
     * `block`, which is the head when `after` is -1. Under checks, a container
     * that does not reach the root through `parentOf` throws, since its entries
     * would be lost, and a rule or an at-rule may join only a rule that nests.
     *
     * @param {number} block
     * @param {number} after
     * @param {number} index an entry that is linked nowhere, or was unlinked
     * @return {void}
     */
    linkAfter(block: number, after: number, index: number): void;
    /**
     * Links the entry at `index` at the end of the chain of the block at `block`.
     *
     * @param {number} block
     * @param {number} index an entry that is linked nowhere, or was unlinked
     * @return {void}
     */
    linkLast(block: number, index: number): void;
    /**
     * Takes the entry at `index` out of its chain. The entry keeps its own
     * subtree, and a later link may place it again.
     *
     * @param {number} index
     * @return {void}
     */
    unlink(index: number): void;
    /**
     * Puts the entry `earlier` in the chain where `later` stands, and unlinks
     * `later`.
     *
     * @param {number} later a linked entry
     * @param {number} earlier an entry that is linked elsewhere, or nowhere
     * @return {void}
     */
    takeLinkOf(later: number, earlier: number): void;
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
     * children, in order, and places the rule. The selector arguments are the
     * rule's, in PostCSS's form, so a caller passes them rather than read the node.
     *
     * @param {Rule} rule
     * @param {string[]} selectors
     * @param {string} selector
     * @param {string} [sourceSelector] set only when the source text differs from the selector
     * @param {readonly CSSToken[]} [tokens] the stored tokens of the source text
     * @return {RuleRecord}
     */
    recordRule(rule: Rule, selectors: string[], selector: string, sourceSelector?: string, tokens?: readonly CSSToken[]): RuleRecord;
}
//# sourceMappingURL=blockRecords.d.ts.map