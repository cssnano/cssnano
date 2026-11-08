import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { assertLiveRule } from './linkChecks.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex} from './blockRecord.js' */

const STALE_KEYS =
  'declaration keys of a rule record are out of step with its chain';

/**
 * @typedef {object} RuleDeclarationKeys
 * @property {readonly ArenaIndex[]} kept the indices of the declarations of the rule, in order
 * @property {ReadonlySet<number>} keySet the ids of the declarations
 */

/**
 * The declarations of each container, kept beside the arena's records. An
 * entry is built at the declaration stamp of its container, and it is stale
 * once a declaration joins or leaves the chain. The arrays are indexed by
 * entry, so the cache keeps no reference to the arena or its links.
 */
export class DeclarationCache {
  /** @type {(RuleDeclarationKeys | undefined)[]} the declarations of each container, undefined until built */
  #entries = [];

  /** @type {number[]} the declaration stamp each entry was built at, -1 before the first build */
  #builtAt = [];

  /** Gives the next entry of the arena an empty cache. */
  grow() {
    this.#entries.push(undefined);
    this.#builtAt.push(-1);
  }

  /**
   * The declarations of the container at `index`, in chain order. A stale
   * entry is rebuilt from the chain.
   *
   * @param {BlockRecords} records the arena that holds the container's children
   * @param {ArenaIndex} index an index that `recordRule` gave
   * @return {RuleDeclarationKeys}
   */
  keysOf(records, index) {
    const stamp = records.declarationStamps.stampOf(index);
    if (this.#builtAt[index] !== stamp) {
      /** @type {ArenaIndex[]} */
      const kept = [];
      const keySet = new Set();
      for (
        let entry = records.links.firstChild(index);
        entry !== -1;
        entry = records.links.nextSibling(entry)
      ) {
        const item = records.entry(entry);
        if (item instanceof DeclarationRecord) {
          kept.push(/** @type {ArenaIndex} */ (entry));
          keySet.add(item.id);
        }
      }
      this.#entries[index] = { kept, keySet };
      this.#builtAt[index] = stamp;
    } else if (consistencyChecksEnabled()) {
      assertKeysFresh(
        records,
        index,
        /** @type {RuleDeclarationKeys} */ (this.#entries[index])
      );
    }
    return /** @type {RuleDeclarationKeys} */ (this.#entries[index]);
  }

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
  appended(index, declaration, before, after) {
    if (this.#builtAt[index] !== before) return;
    const entry = /** @type {RuleDeclarationKeys} */ (this.#entries[index]);
    /** @type {ArenaIndex[]} */ (entry.kept).push(
      /** @type {ArenaIndex} */ (declaration.index)
    );
    /** @type {Set<number>} */ (entry.keySet).add(declaration.id);
    this.#builtAt[index] = after;
  }
}

/** @typedef {Pick<DeclarationCache, 'keysOf'>} DeclarationCacheReader */

/**
 * The declarations of the rule at `index`, in chain order. The entry is the
 * cache's own, so the caller reads it and does not keep it across an edit of
 * the rule.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that `recordRule` gave
 * @return {RuleDeclarationKeys}
 */
export function declarationKeys(records, index) {
  assertLiveRule(records, index);
  return records.declarations.keysOf(
    records,
    /** @type {ArenaIndex} */ (index)
  );
}

/**
 * Under consistency checks, throws when the kept declarations differ from the
 * declarations the chain holds, in order, or when the ids differ from theirs.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {RuleDeclarationKeys} entry
 * @return {void}
 * @throws {Error} when the kept declarations are out of step with the chain
 */
function assertKeysFresh(records, index, entry) {
  const ids = new Set();
  let at = 0;
  for (
    let link = records.links.firstChild(index);
    link !== -1;
    link = records.links.nextSibling(link)
  ) {
    const item = records.entry(link);
    if (!(item instanceof DeclarationRecord)) continue;
    if (entry.kept[at++] !== link || !entry.keySet.has(item.id)) {
      throw new Error(STALE_KEYS);
    }
    ids.add(item.id);
  }
  if (at !== entry.kept.length || ids.size !== entry.keySet.size) {
    throw new Error(STALE_KEYS);
  }
}
