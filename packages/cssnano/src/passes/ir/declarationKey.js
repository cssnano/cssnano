import { propertyNameKey } from './propertyName.js';

/**
 * The fields of a declaration that its key reads. `raws.value` is the value
 * as written, when PostCSS stripped comments from `value`.
 *
 * @typedef {{prop: string, value: string, important?: boolean, raws: {before?: string, value?: {value: string, raw: string}}}} DeclarationFields
 */
/**
 * The fields of an at-rule that its prelude id reads.
 *
 * @typedef {{name: string, params: string, raws: {before?: string, afterName?: string}}} AtRuleFields
 */

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
 * @param {DeclarationFields} declaration
 * @return {string}
 */
export function hackPrefixOf(declaration) {
  return declaration.raws.before?.replaceAll(';', '').trim() ?? '';
}

/**
 * @param {string | undefined} value
 * @return {string | undefined}
 */
function trimValue(value) {
  return value ? value.trim() : value;
}

/**
 * The text a declaration is identified by. A value with an important comment
 * is identified by the value as written, since the comment is part of what the
 * author kept; any other value is identified by `value`. A string that contains
 * `/*!` has the same text as written, so it keys as before.
 *
 * @param {DeclarationFields} declaration
 * @return {string}
 */
function identityValueOf(declaration) {
  const raw = declaration.raws.value;
  const written =
    raw?.value === declaration.value
      ? (raw.raw ?? declaration.value)
      : declaration.value;
  return written.includes('/*!') ? written : declaration.value;
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
  /** @type {Map<number, Trie>} the path of each prelude id, which structural ids extend */
  #preludes = new Map();

  /**
   * The key of a declaration: the same property, value, importance and hack
   * prefix. Names fold ASCII case, except custom properties, which are
   * case-sensitive.
   *
   * @param {DeclarationFields} declaration
   * @return {number}
   */
  keyOf(declaration) {
    let trie = step(this.root, 'decl');
    trie = step(trie, propertyNameKey(declaration.prop));
    trie = step(trie, identityValueOf(declaration));
    trie = step(trie, declaration.important === true);
    return this.leafOf(step(trie, hackPrefixOf(declaration)));
  }

  /**
   * The id of an at-rule's prelude: its name, its params and its trimmed
   * `raws.before` and `raws.afterName`. Ids of the preludes are kept with
   * their paths, for `preludeTrie`.
   *
   * @param {AtRuleFields} node
   * @return {number}
   */
  preludeId(node) {
    let path = step(step(this.root, 'atrule'), node.name);
    path = step(path, node.params);
    path = step(path, trimValue(node.raws.before));
    path = step(path, trimValue(node.raws.afterName));
    const id = this.leafOf(path);
    this.#preludes.set(id, path);
    return id;
  }

  /**
   * The path that a prelude id ends, from `preludeId`, which a structural id
   * extends.
   *
   * @param {number} id
   * @return {Trie}
   */
  preludeTrie(id) {
    return /** @type {Trie} */ (this.#preludes.get(id));
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
