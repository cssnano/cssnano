import { isRuleOrAtRuleKind, RULE } from './blockRecord.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex} from './blockRecord.js' */

const DETACHED_BLOCK = 'an entry is linked into a block outside the tree';
const PLAIN_RULE =
  'a rule or an at-rule is linked into a rule that holds no rules';
const NOT_REACHED = 'a rule is read that the root does not reach';
const LINKED_TWICE = 'an entry is linked while it stands in a chain';

/**
 * The checks of the arena's links. Each one only reads and throws, so the
 * arena calls it under checks and production never runs it.
 */

/**
 * Under checks, walks `parentOf` up from `index` and throws when the walk stops
 * at -1 before the root. An entry linked nowhere is removed, so it throws too.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that the arena gave, or -1
 * @return {void}
 * @throws {Error} under checks, when `index` is not reached by the root
 */
export function assertReached(records, index) {
  if (!records.consistencyChecks) return;
  // An index the arena did not give has no container, so the walk has no start.
  if (records.links.parentOf(index) === undefined) return;
  let at = index;
  while (at !== records.root.index) {
    at = records.links.parentOf(at);
    if (at === -1) throw new Error(NOT_REACHED);
  }
}

/**
 * Under checks, the entry at `index` must stand in no chain, since a second
 * link would leave it in two; the container that receives it must reach the
 * root, and a rule or an at-rule may join only a rule that nests.
 *
 * @param {BlockRecords} records
 * @param {number} block the container that receives the entry
 * @param {number} index the entry that is linked into it
 * @return {void}
 * @throws {Error} under checks, when the link would lose the entry or leave it in two chains
 */
export function assertCanLink(records, block, index) {
  if (!records.consistencyChecks) return;
  if (records.links.parentOf(index) !== -1) throw new Error(LINKED_TWICE);
  assertReachesRoot(records, block);
  assertCanHold(records, block, index);
}

/**
 * @param {BlockRecords} records
 * @param {number} block a container
 * @param {number} index the entry linked into it
 * @return {void}
 * @throws {Error} when a rule or an at-rule is linked into a rule that holds no rules
 */
function assertCanHold(records, block, index) {
  const holder = records.container(block);
  if (holder?.kind === RULE && holder.context === -1) {
    const entry = records.entry(
      /** @type {import('./blockRecord.js').ArenaIndex} */ (index)
    );
    if (isRuleOrAtRuleKind(entry.kind)) throw new Error(PLAIN_RULE);
  }
}

/**
 * @param {BlockRecords} records
 * @param {number} block
 * @return {void}
 * @throws {Error} when a walk up `parentOf` from `block` does not reach the root
 */
function assertReachesRoot(records, block) {
  let at = block;
  while (at !== records.root.index) {
    at = records.links.parentOf(at);
    if (at === -1) throw new Error(DETACHED_BLOCK);
  }
}
