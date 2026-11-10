import type { RuleRecord } from './ruleRecord.js';
import type { TextTable } from '../../../../values/textTable.js';
import type { NodeTable } from './nodeTable.js';
import type { TokenLists } from '../../../ir/tokenLists.js';
/**
 * Writes the selector of a marked rule the root reaches, through the table: the
 * tokens of its ids joined as the rule is written. A rule that no merge marked
 * keeps its node's text, so it is not written.
 *
 * @param {RuleRecord} record
 * @param {NodeTable} nodes
 * @param {TextTable} textTable
 * @param {TokenLists} tokenLists
 * @return {void}
 */
export declare function writeSelector(record: RuleRecord, nodes: NodeTable, textTable: TextTable, tokenLists: TokenLists): void;
//# sourceMappingURL=writeSelector.d.ts.map