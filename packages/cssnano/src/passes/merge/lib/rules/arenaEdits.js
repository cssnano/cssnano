import {
  firstDeclaration,
  inheritWhitespace,
  nextDeclaration,
} from './blockChildren.js';

import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {NodeEntry} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

/*
 * The edits that compose the arena's link wrappers. Each takes the arena
 * first and calls only its public wrappers, so the checks run at every link.
 */

/**
 * Replaces the rule `record` with the rules `replacements`, which take its
 * place in the chain, in order. A replacement that already stands right before
 * `record` is the first of them and stays where it is; the others are linked
 * nowhere.
 *
 * @param {BlockRecords} records
 * @param {number} record the index of the rule that is replaced
 * @param {number[]} replacements
 * @return {void}
 */
export function substitute(records, record, replacements) {
  // The replacements take the chain where the record stood, which may be
  // the record itself; it is read before the record leaves the chain.
  const holder = records.links.parentOf(record);
  const standing = /** @type {number} */ (records.links.prevSibling(record));
  records.unlink(record);
  let after = standing;
  for (const replacement of replacements) {
    if (replacement === standing) continue;
    records.linkAfter(holder, after, replacement);
    after = replacement;
  }
}

/**
 * Moves the rule `record` to the end of the chain of the block at `target`.
 *
 * @param {BlockRecords} records
 * @param {number} target the index of the block that takes the rule
 * @param {number} record the index of the rule
 * @return {void}
 */
export function moveRule(records, target, record) {
  records.unlink(record);
  records.linkLast(target, record);
}

/**
 * Moves the chain of the block at `source` to the end of the chain of the
 * block at `target`. `source` is left with no children, since the caller
 * removes it. A nested block keeps its rule, which moves with the chain.
 *
 * @param {BlockRecords} records
 * @param {number} target
 * @param {number} source
 * @return {void}
 */
export function adopt(records, target, source) {
  // Under checks, `records.block` throws unless `source` is a block.
  records.block(source);
  let entry = records.links.firstChild(source);
  while (entry !== -1) {
    records.unlink(entry);
    records.linkLast(target, entry);
    entry = records.links.firstChild(source);
  }
}

/**
 * Appends a child to the chain of a rule, after its last child, and gives the
 * child the whitespace of that child when it has none. The node takes it at
 * write-back. The child must be linked nowhere, or unlinked.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord} rule
 * @param {DeclarationRecord | NodeEntry} child
 * @return {void}
 */
export function appendChild(records, rule, child) {
  const last = records.links.lastChild(rule.index);
  inheritWhitespace(child, last === -1 ? undefined : records.entry(last));
  records.linkLast(rule.index, child.index);
}

/**
 * Removes the declarations at the arena indices `claimed` from the chain of
 * the rule at `rule`. The node drops them at write-back.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} rule
 * @param {Set<ArenaIndex>} claimed the declarations that leave, each a child of `rule`
 * @return {void}
 */
export function removeDeclarations(records, rule, claimed) {
  if (consistencyChecksEnabled()) assertChildrenOf(records, rule, claimed);
  for (const index of claimed) records.unlink(index);
}

/**
 * Moves the declarations at the arena indices `claimed`, in order, from the
 * chain of `source` to the end of the chain of `target`. The node of `source`
 * keeps them until write-back.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} source
 * @param {ArenaIndex} target
 * @param {ArenaIndex[]} claimed the declarations that move, in their chain order
 * @return {void}
 */
export function moveDeclarations(records, source, target, claimed) {
  if (consistencyChecksEnabled()) assertMovesInOrder(records, source, claimed);
  const receiving = /** @type {RuleRecord} */ (records.rule(target));
  for (const index of claimed) {
    records.unlink(index);
    appendChild(
      records,
      receiving,
      /** @type {DeclarationRecord} */ (records.entry(index))
    );
  }
}

const NOT_A_CHILD =
  'a declaration is removed from a rule that does not hold it';
const OUT_OF_ORDER = 'declarations are moved out of their chain order';

/**
 * Under checks, throws when an index in `claimed` is not a child of `rule`.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} rule
 * @param {Iterable<ArenaIndex>} claimed
 * @return {void}
 * @throws {Error} under checks, for the first index that `rule` does not hold
 */
function assertChildrenOf(records, rule, claimed) {
  for (const index of claimed) {
    if (records.links.parentOf(index) !== rule) throw new Error(NOT_A_CHILD);
  }
}

/**
 * Under checks, throws when a declaration moves from `source` in another
 * order than its chain, or when `source` does not hold it. The chain of
 * `source` is walked once.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} source
 * @param {ArenaIndex[]} claimed
 * @return {void}
 * @throws {Error} under checks, when a claimed index is not a child of `source` in order
 */
function assertMovesInOrder(records, source, claimed) {
  assertChildrenOf(records, source, claimed);
  let at = 0;
  for (
    let declaration = firstDeclaration(records, source);
    declaration !== undefined && at < claimed.length;
    declaration = nextDeclaration(records, declaration)
  ) {
    if (declaration.index === claimed[at]) at++;
  }
  if (at !== claimed.length) throw new Error(OUT_OF_ORDER);
}
