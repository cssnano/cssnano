import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { DeclarationKeys } from '../passes/ir/declarationKey.js';
/**
 * Whether an entry is an overridable at-rule and no at-rule around it is. The
 * walk collects only these, since an overridable at-rule inside another is not
 * compared with the scope of the outer one.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {boolean}
 */
export declare function isOutermostOverridable(records: BlockRecords, index: ArenaIndex): boolean;
/**
 * The scope key of an overridable at-rule: its name and prelude, chained with
 * the name and prelude of the scope at-rules around it, so equal scopes give
 * equal keys. The names are folded and the preludes are interned, so the keys
 * compare as integers.
 *
 * @param {BlockRecords} records
 * @param {DeclarationKeys} keys the run's interner
 * @param {ArenaIndex} index an overridable at-rule
 * @return {number}
 */
export declare function scopeKeyOf(records: BlockRecords, keys: DeclarationKeys, index: ArenaIndex): number;
/**
 * Removes each overridable at-rule that a later one in its scope overrides. The
 * list is in document order, and it is read backwards, so the winning rule of
 * each scope is seen first. A removal makes no message: the node walk never
 * reported one.
 *
 * @param {BlockRecords} records
 * @param {DeclarationKeys} keys the run's interner
 * @param {readonly ArenaIndex[]} overridable the outermost overridable at-rules, in document order
 * @return {void}
 */
export declare function discardOverriddenAtRules(records: BlockRecords, keys: DeclarationKeys, overridable: readonly ArenaIndex[]): void;
//# sourceMappingURL=overridable.d.ts.map