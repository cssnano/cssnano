/** @import {ArenaIndex} from './blockRecord.js' */
import type { ArenaIndex } from './blockRecord.js';
export type LinkReader = Pick<BlockLinks, 'parentOf' | 'prevSibling' | 'nextSibling' | 'firstChild' | 'lastChild' | 'childCount' | 'editedAt' | 'isEdited'>;
/**
 * The reads of the links. `BlockRecords#links` has this type, so an edit
 * reaches the links only through the arena's methods.
 *
 * @typedef {Pick<BlockLinks, 'parentOf' | 'prevSibling' | 'nextSibling' | 'firstChild' | 'lastChild' | 'childCount' | 'editedAt' | 'isEdited'>} LinkReader
 */
/**
 * The links between the entries of the records. Each entry has a container:
 * the block whose chain holds it, or for a nested block the rule that owns it.
 * A chained entry has the entries before and after it in its container's
 * chain. A container is a block, or a rule that nests. The links and the chain
 * ends are plain arrays indexed by entry, grown by `grow` as entries are added,
 * so no link is an object reference.
 */
export declare class BlockLinks {
    #private;
    /** @param {boolean} consistencyChecks */
    constructor(consistencyChecks: boolean);
    /** Gives the next entry of the arena unlinked links and an empty chain. */
    grow(): void;
    /**
     * @param {number} index an index that the arena gave, of a container
     * @return {number} the stamp of the last link or unlink of its chain, 0 for none
     */
    editedAt(index: number): number;
    /**
     * @param {number} index an index that the arena gave, of a container
     * @return {boolean} whether its chain changed after the build settled it
     */
    isEdited(index: number): boolean;
    /** Marks every edit so far as the build's, so that only later edits count. */
    settle(): void;
    /**
     * @param {number} index an index that the arena gave
     * @return {ArenaIndex | -1} the container of the entry, -1 when it is linked nowhere
     */
    parentOf(index: number): ArenaIndex | -1;
    /**
     * @param {number} index an index that the arena gave, linked in a chain
     * @return {ArenaIndex | -1} the entry before `index` in its chain, -1 at the start
     * @throws {Error} under checks, when `index` is linked nowhere
     */
    prevSibling(index: number): ArenaIndex | -1;
    /**
     * @param {number} index an index that the arena gave, linked in a chain
     * @return {ArenaIndex | -1} the entry after `index` in its chain, -1 at the end
     * @throws {Error} under checks, when `index` is linked nowhere
     */
    nextSibling(index: number): ArenaIndex | -1;
    /**
     * @param {number} index an index that the arena gave, of a container
     * @return {ArenaIndex | -1} the first entry of its chain, -1 when it has none
     */
    firstChild(index: number): ArenaIndex | -1;
    /**
     * @param {number} index an index that the arena gave, of a container
     * @return {ArenaIndex | -1} the last entry of its chain, -1 when it has none
     */
    lastChild(index: number): ArenaIndex | -1;
    /**
     * @param {number} index an index that the arena gave, of a container
     * @return {number} the entries in its chain, comments included
     */
    childCount(index: number): number;
    /**
     * Links the entry at `index` after `after` in the chain of the container at
     * `block`, which is the head when `after` is -1. The arena checks the link
     * before it calls this.
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
}
//# sourceMappingURL=blockLinks.d.ts.map