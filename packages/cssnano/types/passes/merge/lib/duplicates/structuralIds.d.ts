import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { AtRule, Comment } from 'postcss';
import type { BlockRecord } from '../rules/blockRecord.js';
import type { RuleRecord } from '../rules/ruleRecord.js';
/**
 * The id of a comment: ordinary comments share one, and an important comment
 * steps its text.
 *
 * @param {DeclarationKeys} keys
 * @param {Comment} node
 * @return {number}
 */
export declare function commentId(keys: DeclarationKeys, node: Comment): number;
/**
 * The id of a statement at-rule, which has no block.
 *
 * @param {DeclarationKeys} keys
 * @param {Set<number>} layered
 * @param {AtRule} node
 * @return {number}
 */
export declare function statementId(keys: DeclarationKeys, layered: Set<number>, node: AtRule): number;
/**
 * The id of a rule or of a block at-rule, from the ids of its kept entries.
 *
 * @param {DeclarationKeys} keys
 * @param {Set<number>} layered
 * @param {BlockRecord | RuleRecord} container the rule, or the block at-rule
 * @param {number[]} childIds the ids of the kept entries, back to front
 * @return {number}
 */
export declare function containerId(keys: DeclarationKeys, layered: Set<number>, container: BlockRecord | RuleRecord, childIds: number[]): number;
//# sourceMappingURL=structuralIds.d.ts.map