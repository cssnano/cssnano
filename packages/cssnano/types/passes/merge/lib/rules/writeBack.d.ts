import type { ChildNode, Container } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { BlockRecord as Block } from './blockRecord.js';
import type MergeState from './mergeState.js';
/**
 * Under consistency checks, throws when the records and the tree disagree:
 * each block must hold the nodes its container holds, in order, and each rule
 * must stand in the slot its record names. Writes nothing.
 *
 * @param {MergeState} mergeState
 * @return {void}
 */
export declare function assertRecordsMatchTree(mergeState: MergeState): void;
export type Rebuilt = {
    container: Container;
    /**
     * the children the container takes
     */
    children: ChildNode[];
    /**
     * the whitespace the first child of a
     * root takes, or undefined for any other container
     */
    leading: string | undefined;
};
/**
 * @typedef {object} Rebuilt
 * @property {Container} container
 * @property {ChildNode[]} children the children the container takes
 * @property {string | undefined} leading the whitespace the first child of a
 * root takes, or undefined for any other container
 */
/**
 * Gives each container its children, after every container has been emptied,
 * so a child that moves between two of them keeps the parent it is given.
 *
 * @param {Rebuilt[]} rebuilt
 * @return {void}
 */
export declare function replaceChildren(rebuilt: Rebuilt[]): void;
/**
 * Gives each block whose live children differ from its container the children
 * the records hold, and each rule that an edit changed the children of. A
 * block that already matches, or was dropped, keeps its child list, and so
 * does a rule that no edit touched.
 *
 * @param {BlockRecords} records
 * @param {Iterable<Block>} blocks
 * @return {void}
 */
export declare function writeBack(records: BlockRecords, blocks: Iterable<Block>): void;
//# sourceMappingURL=writeBack.d.ts.map