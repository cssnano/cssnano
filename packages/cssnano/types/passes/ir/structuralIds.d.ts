import type { ArenaIndex, BlockRecord, NodeEntry } from './blockRecord.js';
import type { BlockRecords } from './blockRecords.js';
import type { DeclarationKeys } from './declarationKey.js';
import type { RuleRecord } from './ruleRecord.js';
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
/**
 * The structural id of the body of a rule or of a block at-rule: the ids of its
 * entries in document order. Two bodies with equal ids hold the same entries
 * in the same order, whatever whitespace their raws spell.
 *
 * @param {DeclarationKeys} keys
 * @param {BlockRecords} records
 * @param {ArenaIndex} container the rule or the block at-rule
 * @return {number}
 */
export declare function bodyId(keys: DeclarationKeys, records: BlockRecords, container: ArenaIndex): number;
//# sourceMappingURL=structuralIds.d.ts.map