import type { RuleRecord } from './ruleRecord.js';
import type { NodeTable } from './nodeTable.js';
import type { TokenLists } from './tokenLists.js';
/**
 * Writes the selector of a marked rule the root reaches: its written list when
 * it has one, otherwise the tokens of its ids joined as the rule is written. The
 * selector is assigned only when its text differs from the node's selector as
 * written, and then the raw is dropped, since it would restore comments the text
 * no longer has. A rule that no merge marked keeps its node's text, so it is
 * not written.
 *
 * @param {RuleRecord} record
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists
 * @return {void}
 */
export declare function writeSelector(record: RuleRecord, nodes: NodeTable, tokenLists: TokenLists): void;
//# sourceMappingURL=writeSelector.d.ts.map