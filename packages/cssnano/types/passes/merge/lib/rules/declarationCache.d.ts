import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { BlockRecords } from './blockRecords.js';
import type { ArenaIndex } from './blockRecord.js';
export type RuleDeclarationKeys = {
    /**
     * the ids of the declarations of the rule, in order
     */
    keys: number[];
    /**
     * the ids of the declarations
     */
    keySet: Set<number>;
};
/**
 * @typedef {object} RuleDeclarationKeys
 * @property {number[]} keys the ids of the declarations of the rule, in order
 * @property {Set<number>} keySet the ids of the declarations
 */
/**
 * The declaration ids of each container, kept beside the arena's records. An
 * entry is built at the declaration stamp of its container, and it is stale
 * once a declaration joins or leaves the chain. The arrays are indexed by
 * entry, so the cache keeps no reference to the arena or its links.
 */
export declare class DeclarationCache {
    #private;
    /** Gives the next entry of the arena an empty cache. */
    grow(): void;
    /**
     * The ids of the declarations of the container at `index`, in chain order.
     * A stale entry is rebuilt from the chain.
     *
     * @param {BlockRecords} records the arena that holds the container's children
     * @param {ArenaIndex} index an index that `recordRule` gave
     * @return {RuleDeclarationKeys}
     */
    keysOf(records: BlockRecords, index: ArenaIndex): RuleDeclarationKeys;
    /**
     * Extends the entry of `index` with a declaration linked last into it, when
     * the entry was built at the stamp the container had before the link. The
     * entry then moves to the stamp of the container after the link. A stale
     * entry is left for `keysOf` to rebuild.
     *
     * @param {ArenaIndex} index the container
     * @param {DeclarationRecord} declaration the declaration linked last
     * @param {number} before the declaration stamp of the container before the link
     * @param {number} after the declaration stamp of the container after the link
     * @return {void}
     */
    appended(index: ArenaIndex, declaration: DeclarationRecord, before: number, after: number): void;
}
export type DeclarationCacheReader = Pick<DeclarationCache, 'keysOf'>;
/** @typedef {Pick<DeclarationCache, 'keysOf'>} DeclarationCacheReader */
/**
 * The ids of the declarations of the rule at `index`, in chain order. The
 * entry is the cache's own, so the caller reads it and does not keep it across
 * an edit of the rule.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that `recordRule` gave
 * @return {RuleDeclarationKeys}
 */
export declare function declarationKeys(records: BlockRecords, index: number): RuleDeclarationKeys;
//# sourceMappingURL=declarationCache.d.ts.map