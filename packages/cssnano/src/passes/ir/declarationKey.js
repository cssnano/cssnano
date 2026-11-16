/** @import {TokenListId} from './tokenLists.js' */

// Marks the end of a component path in a trie, so the id of a path cannot be
// confused with a component.
const LEAF = Symbol('id');

/**
 * Nested maps keyed by the components of a structural description. Each
 * component is one step, so equal descriptions reach the same leaf without
 * concatenating strings.
 * @typedef {Map<unknown, unknown>} Trie
 */

/**
 * @param {Trie} trie
 * @param {unknown} key
 * @return {Trie}
 */
export function step(trie, key) {
  let next = /** @type {Trie | undefined} */ (trie.get(key));
  if (!next) {
    next = new Map();
    trie.set(key, next);
  }
  return next;
}

/**
 * The browser hack in front of a declaration, such as `*` or `_`. The parser
 * keeps it in `raws.before`, not in the property name, so it is part of the
 * declaration's identity. A stray `;` before the declaration is not a hack,
 * and a declaration without `raws.before` has none.
 *
 * @param {string | null} before the declaration's `raws.before`, or null for none
 * @return {string}
 */
export function hackPrefixOf(before) {
  return before?.replaceAll(';', '').trim() ?? '';
}

/**
 * Numbers the declarations and other structural descriptions of one run of the
 * pass. Equal descriptions get equal integers, so callers compare ids rather
 * than trees. Nothing may keep an id across runs.
 */
export class DeclarationKeys {
  /** @type {Trie} */
  root = new Map();
  #lastId = 0;

  /**
   * The key of a declaration: the same property, value list, importance and
   * hack prefix.
   *
   * @param {number} nameId the id of the property name, from the run's PropertyNames
   * @param {TokenListId} valueList the id of the value, which equal values share
   * @param {boolean} important
   * @param {string | null} before the declaration's `raws.before`
   * @return {number}
   */
  keyOf(nameId, valueList, important, before) {
    let trie = step(this.root, 'decl');
    trie = step(trie, nameId);
    trie = step(trie, valueList);
    trie = step(trie, important);
    return this.leafOf(step(trie, hackPrefixOf(before)));
  }

  /**
   * The id of the path that ends at `trie`, assigned on first use.
   *
   * @param {Trie} trie
   * @return {number}
   */
  leafOf(trie) {
    let id = /** @type {number | undefined} */ (trie.get(LEAF));
    if (id === undefined) {
      id = ++this.#lastId;
      trie.set(LEAF, id);
    }
    return id;
  }
}
