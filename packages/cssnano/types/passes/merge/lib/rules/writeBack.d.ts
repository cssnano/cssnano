import { RuleRecord } from './ruleRecord.js';
import { TextTable } from '../../../../values/textTable.js';
import type { ChildNode, Container } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { BlockRecord as Block } from './blockRecord.js';
export type ContainerRecord = Block | RuleRecord;
/**
 * Under consistency checks, throws when the records and the tree disagree:
 * each container must hold the nodes it holds, in order, and each rule must
 * stand in the slot its record names. Writes nothing.
 *
 * @param {BlockRecords} records
 * @return {void}
 */
export declare function assertRecordsMatchTree(records: BlockRecords): void;
export type Rebuilt = {
    container: Container;
    /**
     * the children the container takes
     */
    children: ChildNode[];
    /**
     * the whitespace the first child of a
     * root takes, or null for any other container
     */
    leading: string | null;
};
/**
 * @typedef {object} Rebuilt
 * @property {Container} container
 * @property {ChildNode[]} children the children the container takes
 * @property {string | null} leading the whitespace the first child of a
 * root takes, or null for any other container
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
 * Walks the live tree from the root. Each rule it reaches gets its selector
 * written, and each container whose children differ from its node gets the
 * children the records hold, as does each plain rule that an edit changed the
 * children of. A container that already matches keeps its child list, and so
 * does a plain rule that no edit touched. A record the root does not reach,
 * dropped, keeps its node as it is, and a merged rule the root
 * does not reach gets none.
 *
 * @param {BlockRecords} records
 * @param {TextTable} [textTable] the table the selectors are written through
 * @param {Set<Container> | null} [reported] receives the node of each rule a merge created that the tree reaches
 * @return {void}
 */
export declare function writeBack(records: BlockRecords, textTable?: TextTable, reported?: Set<Container> | null): void;
//# sourceMappingURL=writeBack.d.ts.map