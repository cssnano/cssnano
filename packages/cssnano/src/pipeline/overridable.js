import cssnanoUtils from '#utils';
import { AT_RULE_BLOCK, AT_RULE_STATEMENT } from '../passes/ir/blockRecord.js';
import { step } from '../passes/ir/declarationKey.js';
import { removeEntry } from '../passes/ir/treeEdits.js';

/** @import {ArenaIndex, BlockRecord} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {DeclarationKeys} from '../passes/ir/declarationKey.js' */

const OVERRIDABLE_RULES = new Set(['keyframes', 'counter-style']);
const SCOPE_RULES = new Set(['media', 'supports', 'container', 'layer']);

// The first step of a scope's path, so no scope id is one of another kind.
const SCOPE = Symbol('overridable scope');

/**
 * @param {string} name a folded at-rule name
 * @return {boolean}
 */
function isOverridable(name) {
  return OVERRIDABLE_RULES.has(cssnanoUtils.vendorUnprefixed(name));
}

/**
 * @param {string} name a folded at-rule name
 * @return {boolean}
 */
function isScope(name) {
  return SCOPE_RULES.has(cssnanoUtils.vendorUnprefixed(name));
}

/**
 * The at-rule of an entry, which is a block or a statement.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {BlockRecord | null} null for an entry of another kind
 */
function atRuleOf(records, index) {
  const entry = records.entry(index);
  return entry.kind === AT_RULE_BLOCK || entry.kind === AT_RULE_STATEMENT
    ? /** @type {BlockRecord} */ (entry)
    : null;
}

/**
 * Whether an entry is an overridable at-rule and no at-rule around it is. The
 * walk collects only these, since an overridable at-rule inside another is not
 * compared with the scope of the outer one.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {boolean}
 */
export function isOutermostOverridable(records, index) {
  const atRule = atRuleOf(records, index);
  if (atRule === null || !isOverridable(atRule.name)) return false;
  for (
    let current = records.links.parentOf(index);
    current !== -1;
    current = records.links.parentOf(current)
  ) {
    const ancestor = atRuleOf(records, current);
    if (ancestor !== null && isOverridable(ancestor.name)) return false;
  }
  return true;
}

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
export function scopeKeyOf(records, keys, index) {
  const own = /** @type {BlockRecord} */ (atRuleOf(records, index));
  let trie = step(step(step(keys.root, SCOPE), own.name), own.preludeId);
  for (
    let current = records.links.parentOf(index);
    current !== -1;
    current = records.links.parentOf(current)
  ) {
    const scope = atRuleOf(records, current);
    if (scope !== null && isScope(scope.name)) {
      trie = step(step(trie, scope.name), scope.preludeId);
    }
  }
  return keys.leafOf(trie);
}

/**
 * Removes each overridable at-rule that a later one in its scope overrides. The
 * list is in document order, and it is read backwards, so the winning rule of
 * each scope is seen first. A removal makes no message.
 *
 * @param {BlockRecords} records
 * @param {DeclarationKeys} keys the run's interner
 * @param {readonly ArenaIndex[]} overridable the outermost overridable at-rules, in document order
 * @return {void}
 */
export function discardOverriddenAtRules(records, keys, overridable) {
  const seen = new Set();
  for (let position = overridable.length - 1; position >= 0; position--) {
    const index = overridable[position];
    const key = scopeKeyOf(records, keys, index);
    if (seen.has(key)) {
      removeEntry(records, index);
    } else {
      seen.add(key);
    }
  }
}
