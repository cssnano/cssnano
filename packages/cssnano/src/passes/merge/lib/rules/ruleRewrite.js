/** @import {BlockRecords} from './blockRecords.js' */
import { childCountOf } from './blockChildren.js';
import { minifiedLength } from '../../../ir/minifiedLength.js';
import { findGroup } from './sharedRuleGroup.js';
import { combineSummaries, extendSummaries } from './selectorList.js';
import { listTextLength } from './selectorReads.js';
import {
  moveDeclarations,
  placeBefore,
  removeDeclarations,
} from './arenaEdits.js';
import { RuleRecord } from './ruleRecord.js';

/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {ArenaIndex, BlockRecord} from './blockRecord.js' */
/** @import RuleSequence, {Placement} from './ruleSequence.js' */
/** @import DeclarationScan from './declarationScan.js' */
/** @import MergeState from './mergeState.js' */

/**
 * The rules a rule leaves in its place: the rule itself while it keeps a
 * child, and nothing once it holds no child, when it departs. A kept rule
 * needs no report: only a rule that held a declaration in the first round
 * reaches a merge, so the second round already has it.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} rule the index of the rule
 * @return {ArenaIndex[]}
 */
function leftoverOf(records, rule) {
  if (!childCountOf(records, rule)) return [];
  return [rule];
}

/**
 * Splits the declarations the rules set out of them into a rule with all
 * their selectors, which takes the place of the later rule of the pair,
 * between a leftover of each rule. A rule left without declarations is
 * dropped. Rules after the pair that repeat the shared declarations join
 * when that makes the output shorter.
 *
 * The lengths are those of minified output: raws would count the whitespace
 * of the source, which a minifier removes, so a merge that pays only in
 * source bytes would grow the output.
 *
 * The records of the pair and of the shared declarations are read before the
 * first edit; from there on the rewrite holds their indices.
 *
 * @param {ArenaIndex} firstIndex the index of the earlier rule of the pair
 * @param {ArenaIndex} secondIndex the index of the later rule
 * @param {DeclarationRecord[]} shared the shared declarations, in their order in `first`
 * @param {Set<ArenaIndex>} claimedIndices the arena indices of the declarations of `second` that repeat `shared`
 * @param {import('./mergeState.js').default} mergeState
 * @param {ArenaIndex} secondLink the index of `second` in the sweep
 * @param {RuleSequence} sequence
 * @param {DeclarationScan} scan
 * @return {Placement | null} null when the output would not get shorter
 */
export function buildMergedRule(
  firstIndex,
  secondIndex,
  shared,
  claimedIndices,
  mergeState,
  secondLink,
  sequence,
  scan
) {
  const { records } = mergeState;
  const first = /** @type {RuleRecord} */ (records.rule(firstIndex));
  const second = /** @type {RuleRecord} */ (records.rule(secondIndex));
  let sharedBytes = 0;
  // A later plugin, such as Autoprefixer, removes an outdated prefixed
  // declaration from the rule that sets it, which a shared rule leaves alone.
  let prefixed = 0;
  for (const declaration of shared) {
    const length = minifiedLength(declaration);
    sharedBytes += length;
    const { prop } = declaration;
    if (prop.charCodeAt(0) === 45 && prop.charCodeAt(1) !== 45) {
      prefixed += length;
    }
  }
  // The shared rule repeats both selector lists; a rule left empty is dropped.
  const { tokenLists, browsers } = mergeState;
  let delta =
    listTextLength(tokenLists, first.selectorIds) +
    listTextLength(tokenLists, second.selectorIds) +
    2 -
    sharedBytes;
  if (childCountOf(records, firstIndex) === shared.length) {
    delta -= listTextLength(tokenLists, first.selectorIds) + 1;
  }
  if (childCountOf(records, secondIndex) === claimedIndices.size) {
    delta -= listTextLength(tokenLists, second.selectorIds) + 1;
  }
  // A pair that shortens the output merges alone: the rules after it may
  // join the shared rule later, when it is known which rule it can join.
  const group =
    delta < 0
      ? null
      : findGroup(
          first,
          secondLink,
          shared,
          claimedIndices,
          sharedBytes,
          prefixed,
          delta,
          mergeState,
          sequence,
          scan
        );
  if (delta >= 0 && !group) return null;

  const selectorIds = [
    ...first.selectorIds,
    ...second.selectorIds,
    ...(group?.addedIds ?? []),
  ];
  // The merged rule prints the raws of the rule it was merged from, or of
  // the template that rule printed, when it was merged too.
  const template = second.template === -1 ? secondIndex : second.template;
  const receivingRecord = new RuleRecord(second.before, selectorIds);
  // The summaries of the two rules' selectors are combined, and the group's
  // added selectors are folded after them.
  combineSummaries(receivingRecord, first, second);
  extendSummaries(
    receivingRecord,
    first.selectorIds.length + second.selectorIds.length,
    tokenLists,
    browsers
  );
  receivingRecord.template = template;
  const sharedIndices = shared.map((declaration) => declaration.index);
  // The merged rule takes the place before the later rule, so no rule holds
  // children while it is unlinked. The sweep's replacement keeps that place.
  const receiving = placeBefore(records, secondIndex, receivingRecord);
  // The merged rule takes the declarations of the earlier rule themselves.
  moveDeclarations(records, firstIndex, receiving, sharedIndices);
  const firstLeftover = leftoverOf(records, firstIndex);
  removeDeclarations(records, secondIndex, claimedIndices);
  const secondLeftover = leftoverOf(records, secondIndex);
  /** @type {Placement} */
  const placement = {
    first: firstLeftover,
    second: [receiving, ...secondLeftover].filter((rule) =>
      childCountOf(records, rule)
    ),
  };
  if (group) {
    placement.following = group.followers.map(({ rule, claimed }) => {
      removeDeclarations(records, rule, claimed);
      return leftoverOf(records, rule);
    });
  }
  return placement;
}
