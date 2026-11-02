import { RuleRecord } from './ruleRecord.js';
import type { ChildNode, Container } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { BlockRecord as Block } from './blockRecord.js';
import type MergeState from './mergeState.js';
export type ContainerRecord = Block | RuleRecord;
/**
 * Under consistency checks, throws when the records and the tree disagree:
 * each container must hold the nodes it holds, in order, and each rule must
 * stand in the slot its record names. Writes nothing.
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
 * Gives each container in the live tree whose children differ from its node
 * the children the records hold, and each plain rule that an edit changed the
 * children of. A container that already matches keeps its child list, and so
 * does a plain rule that no edit touched. Dropped and departed records are not
 * in the tree, so they keep theirs.
 *
 * @param {BlockRecords} records
 * @return {void}
 */
export declare function writeBack(records: BlockRecords): void;
//# sourceMappingURL=writeBack.d.ts.map