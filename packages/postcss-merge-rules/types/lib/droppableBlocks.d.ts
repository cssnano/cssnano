import type { ChildNode, Container } from 'postcss';
export type BlockReader = Pick<DroppableBlocks, 'isEmptied'>;
/**
 * Counts the children left in each conditional group rule or named `@layer`
 * block that a rule moved out of, and in each droppable block enclosing one of
 * those. An enclosing block shared with the merge target never reaches none.
 * One that left none applies nothing, so it is invisible to the sweep and
 * removed when the stylesheet is written. A rule moves only from a block into
 * an equivalent earlier one, which already places a layer in the cascade
 * order.
 *
 * Counts start from the children in the source stylesheet and follow every
 * change of the slots. A block that is empty in the source is not tracked: no
 * rule moved out of it, and it may be the first statement that orders its
 * layer.
 */
export default class DroppableBlocks {
    #private;
    /**
     * Starts tracking `node` if it applies nothing once empty and has children.
     *
     * @param {ChildNode} node
     * @return {void}
     */
    register(node: ChildNode): void;
    /**
     * @param {ChildNode | Container} node
     * @return {boolean} whether a rule moved out of `node` and left it no child
     */
    isEmptied(node: ChildNode | Container): boolean;
    /** @return {Container[]} the blocks to remove when the stylesheet is written */
    emptiedBlocks(): Container[];
    /**
     * Accounts for the move of a rule from `source` into `target`.
     *
     * @param {Container} source
     * @param {Container} target
     * @return {void}
     */
    moved(source: Container, target: Container): void;
    /**
     * Accounts for `container` gaining rules, or losing them when `change` is
     * negative.
     *
     * @param {Container} container
     * @param {number} change
     * @return {void}
     */
    changed(container: Container, change: number): void;
}
//# sourceMappingURL=droppableBlocks.d.ts.map