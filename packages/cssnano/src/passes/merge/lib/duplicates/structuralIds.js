import cssnanoUtils from '#utils';
import { step } from '../../../ir/declarationKey.js';

/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {AtRule, Comment} from 'postcss' */
/** @import {BlockRecord} from '../rules/blockRecord.js' */
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
 * @param {string | undefined} value
 * @return {string | undefined}
 */
function trimValue(value) {
  return value ? value.trim() : value;
}

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
 * The id of a statement at-rule, which has no block.
 *
 * @param {DeclarationKeys} keys
 * @param {Set<number>} layered
 * @param {AtRule} node
 * @return {number}
 */
export function statementId(keys, layered, node) {
  const path = atRulePath(step(keys.root, 'atrule'), node);
  return markLayered(
    layered,
    keys.leafOf(path),
    node.name.toLowerCase() === 'layer'
  );
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
  const node = container.node;
  let path;
  let declaresLayer = false;
  if (node.type === 'rule') {
    path = step(
      step(keys.root, 'rule'),
      /** @type {RuleRecord} */ (container).selector
    );
  } else {
    const atRule = /** @type {AtRule} */ (node);
    path = atRulePath(step(keys.root, 'atrule'), atRule);
    declaresLayer = atRule.name.toLowerCase() === 'layer';
  }
  path = step(path, BLOCK);
  for (const id of childIds) {
    declaresLayer ||= layered.has(id);
    path = step(path, id);
  }
  return markLayered(layered, keys.leafOf(path), declaresLayer);
}

/**
 * The path of an at-rule's name, params and trimmed raws, which the id of its
 * block or statement extends.
 *
 * @param {Map<unknown, unknown>} trie the path that begins at the at-rule
 * @param {AtRule} node
 * @return {Map<unknown, unknown>}
 */
function atRulePath(trie, node) {
  let path = step(trie, node.name);
  path = step(path, node.params);
  path = step(path, trimValue(node.raws.before));
  return step(path, trimValue(node.raws.afterName));
}
