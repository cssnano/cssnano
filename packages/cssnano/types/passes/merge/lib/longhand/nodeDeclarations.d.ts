import { BlockDeclarations } from './blockDeclarations.js';
import type { Container, Declaration } from 'postcss';
import type { TextTable } from '../../../../values/textTable.js';
import type { ValueTables } from '../valueList.js';
export type Parent = NonNullable<Declaration['parent']>;
export type NodeBlock = {
    container: Parent;
    list: BlockDeclarations;
    /**
     * the node of each item, by position; a clone's
     * node is made when the block is committed
     */
    nodes: Declaration[];
};
/**
 * Reads the declarations of a block into a list, with the run ends among them.
 *
 * @param {Container} container
 * @param {ValueTables} tables
 * @return {NodeBlock}
 */
export declare function declarationsFromNodes(container: Container, tables: ValueTables): NodeBlock;
/**
 * Writes the block back to its container: the rewrites in place, then the
 * removals and the clones as one rebuild of the child list. Each clone lands
 * directly after its anchor, ahead of the clones the anchor had before it.
 *
 * @param {NodeBlock} block
 * @param {TextTable} textTable
 * @return {void}
 */
export declare function commitToNodes(block: NodeBlock, textTable: TextTable): void;
//# sourceMappingURL=nodeDeclarations.d.ts.map