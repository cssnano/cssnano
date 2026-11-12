import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { BlockRecord, NodeEntry } from '../../../ir/blockRecord.js';
import type { RuleRecord } from '../../../ir/ruleRecord.js';
/**
 * The id of a comment: ordinary comments share one, and an important comment
 * steps its text.
 *
 * @param {DeclarationKeys} keys
 * @param {string} text the text of the comment
 * @return {number}
 */
export declare function commentId(keys: DeclarationKeys, text: string): number;
/**
 * The id of a statement at-rule, which has no block: its prelude's id.
 *
 * @param {DeclarationKeys} keys
 * @param {Set<number>} layered
 * @param {NodeEntry} entry the statement at-rule
 * @return {number}
 */
export declare function statementId(keys: DeclarationKeys, layered: Set<number>, entry: NodeEntry): number;
/**
 * The id of a rule or of a block at-rule, from the ids of its kept entries. A
 * rule's path steps by the id of each of its selectors, so spellings that PostCSS
 * reads as one list give one path.
 *
 * @param {DeclarationKeys} keys
 * @param {Set<number>} layered
 * @param {BlockRecord | RuleRecord} container the rule, or the block at-rule
 * @param {number[]} childIds the ids of the kept entries, back to front
 * @return {number}
 */
export declare function containerId(keys: DeclarationKeys, layered: Set<number>, container: BlockRecord | RuleRecord, childIds: number[]): number;
//# sourceMappingURL=structuralIds.d.ts.map