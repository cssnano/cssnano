import type { ChildNode, Container, Declaration, Root } from 'postcss';
export type Summary = {
    opaque?: boolean;
    declarations?: Declaration[];
};
/**
 * @return {number} the tables attached to a stylesheet right now
 */
export declare function attachedTableCount(): number;
/**
 * @param {boolean} [enabled]
 * @return {void}
 */
export declare function enableConsistencyChecks(enabled?: boolean): void;
/**
 * Summaries of the blocks of one stylesheet, keyed by node. PostCSS stays the
 * source of truth: a summary answers for the subtree as it stood when it was
 * read, and every edit to the subtree calls `invalidate` first.
 *
 * A table built without a root computes each answer from the tree and keeps
 * nothing, so it is never stale.
 */
export declare class BlockTable {
    #private;
    /** @param {Root} [root] the stylesheet this table summarizes */
    constructor(root?: Root);
    /**
     * Stops answering from summaries: the table leaves its stylesheet and
     * drops what it cached. Each later read computes from the tree.
     *
     * @return {void}
     */
    detach(): void;
    /**
     * Records a block the build walk reached.
     *
     * @param {Container} block
     * @return {void}
     */
    add(block: Container): void;
    /**
     * Drops the summary of `node`, if any.
     *
     * @param {object} node
     * @return {void}
     */
    forget(node: object): void;
    /**
     * @return {number} the edits reported so far; a visit that sees it unchanged
     * made none
     */
    get edits(): number;
    /**
     * Records that a visit of `block` joined nothing, so the next visit may skip
     * it while no edit reaches it.
     *
     * @param {object} block
     * @return {void}
     */
    settle(block: object): void;
    /**
     * @param {object} block
     * @return {boolean} whether a visit of `block` may be skipped
     */
    isSettled(block: object): boolean;
    /**
     * True if the subtree holds an at-rule whose position in the cascade is not
     * modelled, so its declarations cannot be reasoned about as plain writes.
     *
     * @param {ChildNode} node
     * @return {boolean}
     */
    opaque(node: ChildNode): boolean;
    /**
     * The declarations of a block, at any depth. The list is shared by later
     * reads, so callers must not change it.
     *
     * @param {ChildNode} node
     * @return {Declaration[]}
     */
    declarations(node: ChildNode): Declaration[];
}
/**
 * Drops the summaries of `node` and of each ancestor, in the table of the
 * stylesheet that holds `node`. Call it before `node` is removed, moved, or
 * given a child, while it still hangs under its parents, since the ancestors
 * are found through the parent links. A node outside every attached tree
 * reaches no table.
 *
 * @param {ChildNode | Container} node
 * @return {void}
 */
export declare function invalidate(node: ChildNode | Container): void;
//# sourceMappingURL=blockTable.d.ts.map