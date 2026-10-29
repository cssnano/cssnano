import type { ChildNode } from 'postcss';
import type { BlockRecord } from './blockRecords.js';
import type { TextTable } from '../../../../values/textTable.js';
/**
 * True for a block that applies nothing once it is empty.
 *
 * @param {ChildNode} node
 * @param {TextTable} textTable
 * @return {boolean}
 */
export declare function isDroppableWhenEmpty(node: ChildNode, textTable: TextTable): boolean;
/**
 * Counts the live children left in each droppable block that a rule moved out
 * of, and in each droppable block enclosing one of those. An enclosing block
 * shared with the merge target never reaches none. One that left none applies
 * nothing, so it is invisible to the sweep and removed when the stylesheet is
 * written. A rule moves only from a block into an equivalent earlier one,
 * which already places a layer in the cascade order.
 *
 * The count is kept on the block record, `remaining`, and each change to a
 * slot updates it. A block that is empty at the start of a sweep is not
 * tracked: no rule moved out of it, and it may be the first statement that
 * orders its layer.
 */
export default class DroppableBlocks {
    #private;
    /**
     * @param {BlockRecord} block
     * @return {boolean} whether a sweep removes the block once it is empty
     */
    isEmptied(block: BlockRecord): boolean;
    /**
     * Accounts for the move of a rule from `source` into `target`.
     *
     * @param {BlockRecord} source
     * @param {BlockRecord} target
     * @return {void}
     */
    moved(source: BlockRecord, target: BlockRecord): void;
    /**
     * Accounts for `block` gaining rules, or losing them when `change` is
     * negative.
     *
     * @param {BlockRecord} block
     * @param {number} change
     * @return {void}
     */
    changed(block: BlockRecord, change: number): void;
}
//# sourceMappingURL=droppableBlocks.d.ts.map