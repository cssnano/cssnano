import type { ChildNode, Container } from 'postcss';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { BlockRecord } from './blockRecord.js';
import type { NodeEntry } from './blockRecord.js';
import type { ArenaIndex } from './blockRecord.js';
import type { LinkReader } from './blockLinks.js';
import type { DeclarationStampReader } from './declarationStamps.js';
import type { DeclarationCacheReader } from './declarationCache.js';
/** @import {NodeEntry} from './blockRecord.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {LinkReader} from './blockLinks.js' */
/** @import {DeclarationStampReader} from './declarationStamps.js' */
/** @import {DeclarationCacheReader} from './declarationCache.js' */
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
    /** @type {boolean} whether reads and edits check the tree, fixed by the run */
    consistencyChecks: boolean;
    /** @type {DeclarationStampReader} the declaration stamps, read here and moved through this arena */
    declarationStamps: DeclarationStampReader;
    /** @type {DeclarationCacheReader} the declaration ids, read here and extended through this arena */
    declarations: DeclarationCacheReader;
    /**
     * The most rounds a run may take before it throws. Set from the counts of
     * rules, at-rules and declarations when the records are built.
     *
     * @type {number}
     */
    maxRounds: number;
    /**
     * @param {BlockRecord} root the record of the stylesheet
     * @param {boolean} consistencyChecks whether the arena and its tables check their reads and edits
     */
    constructor(root: BlockRecord, consistencyChecks: boolean);
    /**
     * Gives an entry the next index of the arena and keeps it there, then links
     * it at the end of the chain of `container`. The entry is unplaced, its index
     * -1, until this call.
     *
     * @param {number} container
     * @param {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} entry
     * @return {void}
     */
    appendEntry(container: number, entry: BlockRecord | RuleRecord | DeclarationRecord | NodeEntry): void;
    /**
     * Gives an unplaced entry the next index of the arena and links it after
     * `after` in the chain of `container`, which is the head when `after` is -1.
     *
     * @param {number} container
     * @param {number} after
     * @param {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} entry
     * @return {void}
     */
    insertEntry(container: number, after: number, entry: BlockRecord | RuleRecord | DeclarationRecord | NodeEntry): void;
    /**
     * @param {ArenaIndex} index an index that the arena gave
     * @return {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry}
     */
    entry(index: ArenaIndex): BlockRecord | RuleRecord | DeclarationRecord | NodeEntry;
    /**
     * @param {number} index an index that the arena gave, or -1 for no block
     * @return {BlockRecord | undefined} undefined for -1
     * @throws {Error} under checks, when the entry at `index` is not a block
     */
    block(index: number): BlockRecord | undefined;
    /**
     * @param {number} index an index that the arena gave, or -1 for none
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
     * @param {number} index an index that the arena gave; under checks, throws when the root does not reach it
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
     * @return {number} the entries the arena holds, dropped ones included
     */
    entryCount(): number;
    /**
     * The PostCSS node of the entry at `index`, which is a rule, a block, a
     * declaration or a bare node.
     *
     * @param {number} index
     * @return {ChildNode}
     */
    nodeOf(index: number): ChildNode;
    /**
     * Settles the links once the build has linked the children, so that only
     * edits after the build count as edits. Entries from here on are the merges'.
     *
     * @return {void}
     */
    settle(): void;
    /**
     * @return {number} the entries the build made, which precede every entry a merge added
     */
    get builtCount(): number;
    /**
     * Adds the node of each rule a merge created that has one, in arena order,
     * which is the order the merges made them. Write-back calls it after its walk.
     *
     * @param {Set<Container>} reported
     * @return {void}
     */
    addMergedNodes(reported: Set<Container>): void;
}
//# sourceMappingURL=blockRecords.d.ts.map