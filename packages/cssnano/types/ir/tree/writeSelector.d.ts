import type { AtRule, Rule } from 'postcss';
import type { RuleRecord } from '../ruleRecord.js';
import type { BlockRecord } from '../blockRecord.js';
import type { NodeTable } from './nodeTable.js';
import type { TokenLists } from '../tokenLists.js';
/**
 * Writes the head of a marked rule or at-rule block and its separator. The
 * head is the selector or the prelude as its record spells it. A backslash
 * before a space or tab that ends the marked head escapes it, so the character
 * goes back to the front of the separator, where the parser puts it.
 *
 * An unmarked head keeps its node's text. Its character is read from the node's
 * own separator, which the build left unchanged.
 *
 * @param {RuleRecord | BlockRecord} record
 * @param {Rule | AtRule} node
 * @param {TokenLists} tokenLists
 * @return {void}
 */
export declare function writeHead(record: RuleRecord | BlockRecord, node: Rule | AtRule, tokenLists: TokenLists): void;
/**
 * Writes the selector and the separator of a rule the root reaches, then the
 * template raw of a merged rule. A rule that no merge marked keeps its node's
 * selector, as the head is written only when it differs from the node's.
 *
 * @param {RuleRecord} record
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists
 * @return {void}
 */
export declare function writeSelector(record: RuleRecord, nodes: NodeTable, tokenLists: TokenLists): void;
//# sourceMappingURL=writeSelector.d.ts.map