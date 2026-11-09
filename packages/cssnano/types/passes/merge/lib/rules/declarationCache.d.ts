import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { PropertyWrites } from './propertyWrites.js';
import type { BlockRecords } from './blockRecords.js';
import type { ArenaIndex } from './blockRecord.js';
export type RuleDeclarationKeys = {
    /**
     * the indices of the declarations of the rule, in order
     */
    kept: readonly ArenaIndex[];
    /**
     * the ids of the declarations
     */
    keySet: ReadonlySet<number>;
    /**
     * the writes of `kept`, numbered by position; undefined until a caller asks
     */
    writes: PropertyWrites | undefined;
};
export type ReceivingDeclarations = RuleDeclarationKeys & {
    writes: PropertyWrites;
};
export type RebuildCount = {
    rebuilds: number;
    walked: number;
};
export type RebuildCounts = {
    /**
     * entries rebuilt by `keysOf`
     */
    keys: RebuildCount;
    /**
     * entries rebuilt by `receivingOf`
     */
    receiving: RebuildCount;
    /**
     * writes built by `receivingOf`
     */
    writes: RebuildCount;
};
/**
 * @typedef {object} RuleDeclarationKeys
 * @property {readonly ArenaIndex[]} kept the indices of the declarations of the rule, in order
 * @property {ReadonlySet<number>} keySet the ids of the declarations
 * @property {PropertyWrites | undefined} writes the writes of `kept`, numbered by position; undefined until a caller asks
 */
/** @typedef {RuleDeclarationKeys & {writes: PropertyWrites}} ReceivingDeclarations */
/**
 * How often one kind of rebuild ran, and how many chain entries or writes it
 * walked. Only tests read them; the cache never reads them to decide.
 *
 * @typedef {{rebuilds: number, walked: number}} RebuildCount
 */
/**
 * @typedef {object} RebuildCounts
 * @property {RebuildCount} keys entries rebuilt by `keysOf`
 * @property {RebuildCount} receiving entries rebuilt by `receivingOf`
 * @property {RebuildCount} writes writes built by `receivingOf`
 */
/**
 * The declarations of each container, kept beside the arena's records. An
 * entry is built at the declaration stamp of its container, and it is stale
 * once a declaration joins or leaves the chain. The arrays are indexed by
 * entry, so the cache keeps no reference to the arena or its links.
 */
export declare class DeclarationCache {
    #private;
    /** @param {boolean} consistencyChecks */
    constructor(consistencyChecks: boolean);
    /** @return {RebuildCounts} the rebuilds this cache ran, for tests and the perf file */
    get rebuilds(): RebuildCounts;
    /** Gives the next entry of the arena an empty cache. */
    grow(): void;
    /**
     * The declarations of the container at `index`, in chain order. A stale
     * entry is rebuilt from the chain.
     *
     * @param {BlockRecords} records the arena that holds the container's children
     * @param {ArenaIndex} index an index that `recordRule` gave
     * @return {RuleDeclarationKeys}
     */
    keysOf(records: BlockRecords, index: ArenaIndex): RuleDeclarationKeys;
    /**
     * The declarations of the container at `index`, with the writes of `kept`
     * built on first asking. Under checks, the writes of an entry that already
     * has them are compared with a fresh build.
     *
     * @param {BlockRecords} records the arena that holds the container's children
     * @param {ArenaIndex} index an index that `recordRule` gave
     * @return {ReceivingDeclarations}
     */
    receivingOf(records: BlockRecords, index: ArenaIndex): ReceivingDeclarations;
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
export type DeclarationCacheReader = Pick<DeclarationCache, 'keysOf' | 'receivingOf' | 'rebuilds'>;
/** @typedef {Pick<DeclarationCache, 'keysOf' | 'receivingOf' | 'rebuilds'>} DeclarationCacheReader */
/**
 * The declarations of the rule at `index`, in chain order. The entry is the
 * cache's own, so the caller reads it and does not keep it across an edit of
 * the rule.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that `recordRule` gave
 * @return {RuleDeclarationKeys}
 */
export declare function declarationKeys(records: BlockRecords, index: number): RuleDeclarationKeys;
/**
 * The declarations of the rule at `index`, in chain order, with the writes that
 * name the last declaration of each property. The entry is the cache's own: a
 * caller reads it again after an edit and keeps nothing of it across one.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that `recordRule` gave
 * @return {ReceivingDeclarations}
 */
export declare function receivingDeclarations(records: BlockRecords, index: number): ReceivingDeclarations;
//# sourceMappingURL=declarationCache.d.ts.map