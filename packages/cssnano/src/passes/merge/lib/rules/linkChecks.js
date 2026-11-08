import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord, NodeEntry } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex} from './blockRecord.js' */

const DETACHED_BLOCK = 'an entry is linked into a block outside the tree';
const PLAIN_RULE =
  'a rule or an at-rule is linked into a rule that holds no rules';
const NOT_REACHED = 'a rule is read that the root does not reach';
const DEPARTED = 'read of a departed rule record';

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
  if (!consistencyChecksEnabled()) return;
  // An index the arena did not give has no container, so the walk has no start.
  if (records.links.parentOf(index) === undefined) return;
  let at = index;
  while (at !== records.root.index) {
    at = records.links.parentOf(at);
    if (at === -1) throw new Error(NOT_REACHED);
  }
}

/**
 * Under checks, the container that receives `index` must reach the root, and
 * a rule or an at-rule may join only a rule that nests.
 *
 * @param {BlockRecords} records
 * @param {number} block the container that receives the entry
 * @param {number} index the entry that is linked into it
 * @return {void}
 * @throws {Error} under checks, when the link would lose the entry
 */
export function assertCanLink(records, block, index) {
  if (!consistencyChecksEnabled()) return;
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
export function assertCanHold(records, block, index) {
  const holder = records.container(block);
  if (holder instanceof RuleRecord && holder.context === -1) {
    const entry = records.entry(
      /** @type {import('./blockRecord.js').ArenaIndex} */ (index)
    );
    const nests =
      entry instanceof RuleRecord ||
      entry instanceof BlockRecord ||
      (entry instanceof NodeEntry && entry.node.type === 'atrule');
    if (nests) throw new Error(PLAIN_RULE);
  }
}

/**
 * @param {BlockRecords} records
 * @param {number} block
 * @return {void}
 * @throws {Error} when a walk up `parentOf` from `block` does not reach the root
 */
export function assertReachesRoot(records, block) {
  let at = block;
  while (at !== records.root.index) {
    at = records.links.parentOf(at);
    if (at === -1) throw new Error(DETACHED_BLOCK);
  }
}

/**
 * Under checks, throws when the rule at `index` is not reached by the root or
 * has left the stylesheet. Each read of a rule that a function makes runs it.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that `recordRule` gave
 * @return {void}
 * @throws {Error} under checks, when the rule is unreached or departed
 */
export function assertLiveRule(records, index) {
  if (!consistencyChecksEnabled()) return;
  const rule = records.rule(/** @type {ArenaIndex} */ (index));
  if (rule?.departed) throw new Error(DEPARTED);
}
