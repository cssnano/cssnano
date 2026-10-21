import { propertyNameKey } from './propertyName.js';

/** @import {Declaration} from 'postcss' */

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
 * declaration's identity. A declaration without `raws.before` has no hack.
 *
 * @param {Declaration} declaration
 * @return {string}
 */
export function hackPrefixOf(declaration) {
  return declaration.raws.before?.trim() ?? '';
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
   * The key of a declaration: the same property, value, importance and hack
   * prefix. Names fold ASCII case, except custom properties, which are
   * case-sensitive.
   *
   * @param {Declaration} declaration
   * @return {number}
   */
  keyOf(declaration) {
    let trie = step(this.root, 'decl');
    trie = step(trie, propertyNameKey(declaration.prop));
    trie = step(trie, declaration.value);
    trie = step(trie, declaration.important === true);
    return this.leafOf(step(trie, hackPrefixOf(declaration)));
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
