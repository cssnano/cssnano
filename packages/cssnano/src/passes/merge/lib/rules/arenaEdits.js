import { inheritWhitespace } from './blockChildren.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {ChainPosition} from './blockRecord.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {NodeEntry} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

/*
 * The edits that compose the arena's link wrappers. Each takes the arena
 * first and calls only its public wrappers, so the checks run at every link.
 */

/**
 * Replaces the rule `record` with the rules `replacements`, which take its
 * place in the chain, in order.
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
  let after = /** @type {number} */ (records.links.prevSibling(record));
  records.unlink(record);
  for (const replacement of replacements) {
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
  const from = /** @type {BlockRecord} */ (records.block(source));
  while (from.first !== -1) {
    const entry = from.first;
    records.unlink(entry);
    records.linkLast(target, entry);
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
 * Removes the declarations of a rule at the positions `claimed`, which index
 * the declarations as they stand at the call. The node drops them at
 * write-back.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord} rule
 * @param {Set<ChainPosition>} claimed the positions of the declarations that leave
 * @return {void}
 */
export function removeDeclarationsAt(records, rule, claimed) {
  takeDeclarationsAt(records, rule, claimed);
}

/**
 * Removes the declarations of a rule at the positions `claimed`, as
 * `removeDeclarationsAt` does, and returns their records for another rule to
 * append.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord} rule
 * @param {Set<ChainPosition>} claimed the positions of the declarations that leave
 * @return {DeclarationRecord[]} the removed records, in order
 */
export function takeDeclarationsAt(records, rule, claimed) {
  const taken = claimedAt(records, rule, claimed);
  for (const declaration of taken) records.unlink(declaration.index);
  return taken;
}

/**
 * The declarations of `rule` at the positions `claimed` as it stands now.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord} rule
 * @param {Set<ChainPosition>} claimed
 * @return {DeclarationRecord[]}
 */
function claimedAt(records, rule, claimed) {
  /** @type {DeclarationRecord[]} */
  const taken = [];
  let position = 0;
  for (
    let declaration = records.firstDeclaration(rule.index);
    declaration !== undefined;
    declaration = records.nextDeclaration(declaration)
  ) {
    if (claimed.has(/** @type {ChainPosition} */ (position++)))
      taken.push(declaration);
  }
  return taken;
}
