import cssnanoUtils from '#utils';
import { step } from './declarationKey.js';
import {
  AT_RULE_STATEMENT,
  COMMENT,
  DECLARATION,
  LAYER,
  RULE,
} from './blockRecord.js';

/** @import {ArenaIndex, BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {DeclarationKeys, Trie} from './declarationKey.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

const { isImportantComment } = cssnanoUtils;

// Marks the block of a container in its structural path, so a block cannot be
// confused with a statement that has the same prelude.
const BLOCK = Symbol('block');

/**
 * Structural ids are interned by `keys`, so equal descriptions get equal ids.
 * `layered` holds the ids of the nodes that declare a layer, which keep their
 * place in the cascade.
 */

/**
 * Records the id of a node in `layered` when the node declares a layer.
 *
 * @param {Set<number>} layered
 * @param {number} id
 * @param {boolean} isLayer
 * @return {number}
 */
function markLayered(layered, id, isLayer) {
  if (isLayer) layered.add(id);
  return id;
}

/**
 * The id of a comment: ordinary comments share one, and an important comment
 * steps its text.
 *
 * @param {DeclarationKeys} keys
 * @param {string} text the text of the comment
 * @return {number}
 */
export function commentId(keys, text) {
  let trie = step(keys.root, 'comment');
  if (isImportantComment(text)) trie = step(trie, text);
  return keys.leafOf(trie);
}

/**
 * The trimmed text of a raw, or null for a raw the node has none of.
 *
 * @param {string | null} text
 * @return {string | null}
 */
function trimmed(text) {
  return text ? text.trim() : text;
}

/**
 * The path of an at-rule's prelude: its folded name, the id of its list, and
 * its trimmed `before` and `afterName`. A statement ends the path, and a block
 * extends it.
 *
 * @param {DeclarationKeys} keys
 * @param {BlockRecord | NodeEntry} entry
 * @return {Trie}
 */
function preludePathOf(keys, entry) {
  let path = step(step(keys.root, 'atrule'), entry.name);
  path = step(path, entry.preludeId);
  path = step(path, trimmed(entry.before));
  return step(path, trimmed(entry.afterName));
}

/**
 * The id of a statement at-rule, which has no block: its prelude's id.
 *
 * @param {DeclarationKeys} keys
 * @param {Set<number>} layered
 * @param {NodeEntry} entry the statement at-rule
 * @return {number}
 */
export function statementId(keys, layered, entry) {
  return markLayered(
    layered,
    keys.leafOf(preludePathOf(keys, entry)),
    entry.atRuleKind === LAYER
  );
}

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
export function containerId(keys, layered, container, childIds) {
  let path;
  let declaresLayer = false;
  if (container.kind === RULE) {
    path = step(keys.root, 'rule');
    for (const id of /** @type {RuleRecord} */ (container).selectorIds)
      path = step(path, id);
  } else {
    path = preludePathOf(keys, container);
    declaresLayer = container.atRuleKind === LAYER;
  }
  path = step(path, BLOCK);
  for (const id of childIds) {
    declaresLayer ||= layered.has(id);
    path = step(path, id);
  }
  return markLayered(layered, keys.leafOf(path), declaresLayer);
}

/**
 * The id of an entry of a body, as the duplicate pass gives an entry of its
 * container: a declaration by its record id, a comment by its text, and a
 * statement or a container by its structure.
 *
 * @param {DeclarationKeys} keys
 * @param {Set<number>} layered
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {number}
 */
function entryIdOf(keys, layered, records, index) {
  const entry = records.entry(index);
  if (entry.kind === DECLARATION) return entry.id;
  if (entry.kind === COMMENT) return commentId(keys, entry.text);
  if (entry.kind === AT_RULE_STATEMENT) {
    return statementId(keys, layered, /** @type {NodeEntry} */ (entry));
  }
  const childIds = [];
  for (
    let child = records.links.firstChild(index);
    child !== -1;
    child = records.links.nextSibling(child)
  ) {
    childIds.push(entryIdOf(keys, layered, records, child));
  }
  return containerId(
    keys,
    layered,
    /** @type {BlockRecord | RuleRecord} */ (entry),
    childIds
  );
}

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
export function bodyId(keys, records, container) {
  const layered = new Set();
  let path = step(keys.root, 'body');
  for (
    let child = records.links.firstChild(container);
    child !== -1;
    child = records.links.nextSibling(child)
  ) {
    path = step(path, entryIdOf(keys, layered, records, child));
  }
  return keys.leafOf(path);
}
