import cssnanoUtils from '#utils';
import { step } from '../../../ir/declarationKey.js';
import { LAYER, RULE } from '../rules/blockRecord.js';

/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {Comment} from 'postcss' */
/** @import {BlockRecord, NodeEntry} from '../rules/blockRecord.js' */
/** @import {RuleRecord} from '../rules/ruleRecord.js' */

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
 * @param {Comment} node
 * @return {number}
 */
export function commentId(keys, node) {
  let trie = step(keys.root, 'comment');
  if (isImportantComment(node.text)) trie = step(trie, node.text);
  return keys.leafOf(trie);
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
  return markLayered(layered, entry.preludeId, entry.kind === LAYER);
}

/**
 * The id of a rule or of a block at-rule, from the ids of its kept entries.
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
    path = step(
      step(keys.root, 'rule'),
      /** @type {RuleRecord} */ (container).selector
    );
  } else {
    path = keys.preludeTrie(container.preludeId);
    declaresLayer = container.kind === LAYER;
  }
  path = step(path, BLOCK);
  for (const id of childIds) {
    declaresLayer ||= layered.has(id);
    path = step(path, id);
  }
  return markLayered(layered, keys.leafOf(path), declaresLayer);
}
