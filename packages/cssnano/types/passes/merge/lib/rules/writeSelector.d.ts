import type { BlockRecords } from './blockRecords.js';
import type { RuleRecord } from './ruleRecord.js';
import type { TextTable } from '../../../../values/textTable.js';
import type { NodeTable } from './nodeTable.js';
/**
 * Writes the selector of a rule the root reaches, through the table: the text,
 * and the tokens the record holds or joins from its pieces. Then stores the
 * tokens of an unmarked rule that the compatibility check tokenized, so a later
 * reader of the table does not tokenize them again.
 *
 * @param {RuleRecord} record
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {TextTable} textTable
 * @return {void}
 */
export declare function writeSelector(record: RuleRecord, records: BlockRecords, nodes: NodeTable, textTable: TextTable): void;
//# sourceMappingURL=writeSelector.d.ts.map