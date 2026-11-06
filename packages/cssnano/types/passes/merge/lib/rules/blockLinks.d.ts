import { BlockRecord } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { BlockRecords } from './blockRecords.js';
/**
 * The links between the entries of the records. Each entry has a container:
 * the block whose chain holds it, or for a nested block the rule that owns it.
 * A chained entry has the entries before and after it in its container's
 * chain, and the chain's ends are `first` and `last` on the container's record.
 * A container is a block, or a rule that nests. The links are plain arrays
 * indexed by entry, grown by `grow` as entries are added, so no link is an
 * object reference.
 */
export declare class BlockLinks {
    #private;
    /** @param {BlockRecords} records the arena whose entries these links join */
    constructor(records: BlockRecords);
    /** Gives the next entry of the arena unlinked links. */
    grow(): void;
    /**
     * The container whose chain holds the entry at `index`.
     *
     * @param {number} index an index that the arena gave
     * @return {BlockRecord | RuleRecord | undefined} undefined when the entry is linked nowhere
     */
    enclosingContainer(index: number): BlockRecord | RuleRecord | undefined;
    /**
     * @param {number} index an index that the arena gave
     * @return {number} the container of the entry, -1 when it is linked nowhere
     */
    parentOf(index: number): number;
    /**
     * @param {number} index an index that the arena gave, linked in a chain
     * @return {number} the entry before `index` in its chain, -1 at the start
     * @throws {Error} under checks, when `index` is linked nowhere
     */
    prevSibling(index: number): number;
    /**
     * @param {number} index an index that the arena gave, linked in a chain
     * @return {number} the entry after `index` in its chain, -1 at the end
     * @throws {Error} under checks, when `index` is linked nowhere
     */
    nextSibling(index: number): number;
    /**
     * @param {number} index an index that the arena gave, of a container
     * @return {number} the first entry of its chain, -1 when it has none
     */
    firstChild(index: number): number;
    /**
     * @param {number} index an index that the arena gave, of a container
     * @return {number} the last entry of its chain, -1 when it has none
     */
    lastChild(index: number): number;
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
     * Under checks, walks `parentOf` up from `index` and throws when a container
     * above it stops the walk at -1. An entry linked nowhere is unplaced and passes.
     *
     * @param {number} index an index that the arena gave, or -1
     * @return {void}
     * @throws {Error} under checks, when a container above `index` does not reach the root
     */
    assertReached(index: number): void;
}
//# sourceMappingURL=blockLinks.d.ts.map