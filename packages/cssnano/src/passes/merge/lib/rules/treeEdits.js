import { DECLARATION } from './blockRecord.js';
import { declarationIsEqual } from './declarations.js';
import { appendChild } from './arenaEdits.js';
import { receivingDeclarations } from './declarationCache.js';

/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import MergeState from './mergeState.js' */
/** @import {RunContext} from '../../../ir/runContext.js' */

/**
 * The edits that rule merging makes to the records of the stylesheet. Each one
 * updates the records it touches, so a join cannot leave a stale answer
 * behind. The PostCSS nodes catch up at write-back, which rebuilds the child
 * lists that changed. Lib code outside this module edits through these names.
 */

/**
 * Takes an entry out of its parent's records at once. The PostCSS child list
 * catches up at write-back.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index the index of the rule, the block of the at-rule, or another entry
 * @return {void}
 */
export function remove(records, index) {
  records.detach(index);
}

/**
 * Moves the entry `earlier`, which already holds the joined content, to the
 * place of `later`, so the joined node takes the later position and keeps the
 * whitespace before `later`.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} earlier the index of a rule, or of the block of an at-rule
 * @param {ArenaIndex} later the index of a rule, or of the block of an at-rule, of the same kind
 * @return {void}
 */
export function takePlaceOf(records, earlier, later) {
  // The first child of the stylesheet leaves its place, so the whitespace it
  // held passes to the child after it, which `later` gave to `earlier`.
  const { root } = records;
  if (records.links.firstChild(root.index) === earlier) {
    records.leadingWhitespace = records.entry(later).before;
  }
  records.moveBefore(later, earlier);
  records.detach(later);
  records.entry(earlier).before = records.entry(later).before;
}

/**
 * Appends the children of `incoming` to `receiving`, comments included. A
 * declaration of `incoming` is redundant only when the last declaration of
 * `receiving` that can set the same property already has an identical value.
 * Otherwise it revives an overridden value or overrides intermediate
 * declarations, so appending it is required to preserve the cascade result.
 *
 * Each pass reads the declarations of `receiving` before its duplicate test,
 * so a pass sees the appends before it. The loop's only edit of `receiving` is
 * appendChild, which keeps the entry fresh, so only the first read of a merge
 * can rebuild it.
 *
 * @param {MergeState} mergeState
 * @param {ArenaIndex} receiving
 * @param {ArenaIndex} incoming
 * @return {void}
 */
export function appendToDeclarations(mergeState, receiving, incoming) {
  const { records } = mergeState;
  const { links } = records;
  // Each child is unlinked before it is read, so the loop holds no link cursor
  // across an edit.
  for (
    let first = links.firstChild(incoming);
    first !== -1;
    first = links.firstChild(incoming)
  ) {
    const child = /** @type {DeclarationRecord | NodeEntry} */ (
      records.entry(first)
    );
    records.detach(first);
    if (child.kind === DECLARATION) {
      const { kept, writes } = receivingDeclarations(records, receiving);
      const last = writes.lastConflict(child.keys);
      if (
        last !== -1 &&
        declarationIsEqual(
          /** @type {DeclarationRecord} */ (records.entry(kept[last])),
          child
        )
      )
        continue;
    }
    appendChild(
      records,
      /** @type {RuleRecord} */ (records.rule(receiving)),
      child
    );
  }
}

/**
 * Removes `records` from the records of their parent. The PostCSS child list
 * catches up at write-back.
 *
 * @param {MergeState} mergeState
 * @param {Set<ArenaIndex>} indices the indices of the rules to remove
 * @return {void}
 */
export function removeRules(mergeState, indices) {
  const arena = mergeState.records;
  const { root } = arena;
  const first = arena.links.firstChild(root.index);
  let leadsRoot = false;
  for (const index of indices) {
    // Under checks, `rule` throws when the root does not reach the rule.
    arena.rule(index);
    leadsRoot ||= index === first;
    arena.detach(index);
  }
  // Unlike `remove`, the rest keep their own whitespace, so the first of them
  // takes its own as the leading whitespace of the stylesheet.
  if (leadsRoot) {
    const head = arena.links.firstChild(root.index);
    arena.leadingWhitespace = head === -1 ? null : arena.entry(head).before;
  }
}
