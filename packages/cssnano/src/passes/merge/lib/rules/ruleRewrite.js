/** @import {BlockRecords} from './blockRecords.js' */
import { childCountOf } from './blockChildren.js';
import { minifiedLength } from '../../../ir/minifiedLength.js';
import { findGroup, selectorsLength } from './sharedRuleGroup.js';
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
 * @param {RuleRecord[]} records
 * @return {ArenaIndex[]} the index of each rule
 */
function indicesOf(records) {
  return records.map((record) => record.index);
}

/**
 * The rules a rule leaves in its place: the rule itself while it keeps a
 * child, and nothing once it holds no child, when it departs. A kept rule
 * needs no report: only a rule that held a declaration in the first round
 * reaches a merge, so the second round already has it.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord} record
 * @return {RuleRecord[]}
 */
function leftoverOf(records, record) {
  if (!childCountOf(records, record.index)) return [];
  return [record];
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
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @param {DeclarationRecord[]} shared the shared declarations, in their order in `first`
 * @param {Set<ArenaIndex>} claimedIndices the arena indices of the declarations of `second` that repeat `shared`
 * @param {import('./mergeState.js').default} mergeState
 * @param {ArenaIndex} secondLink the index of `second` in the sweep
 * @param {RuleSequence} sequence
 * @param {DeclarationScan} scan
 * @return {Placement | null} null when the output would not get shorter
 */
export function buildMergedRule(
  first,
  second,
  shared,
  claimedIndices,
  mergeState,
  secondLink,
  sequence,
  scan
) {
  const firstSelectors = first.selectors;
  const secondSelectors = second.selectors;
  const { records } = mergeState;
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
  let delta =
    selectorsLength(firstSelectors) +
    selectorsLength(secondSelectors) +
    2 -
    sharedBytes;
  if (childCountOf(records, first.index) === shared.length) {
    delta -= selectorsLength(firstSelectors) + 1;
  }
  if (childCountOf(records, second.index) === claimedIndices.size) {
    delta -= selectorsLength(secondSelectors) + 1;
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

  const selectors = [
    ...firstSelectors,
    ...secondSelectors,
    ...(group?.added ?? []),
  ];
  const selectorIds = [
    ...first.selectorIds,
    ...second.selectorIds,
    ...(group?.addedIds ?? []),
  ];
  // The merged rule prints the raws of the rule it was merged from, or of
  // the template that rule printed, when it was merged too.
  const template = second.template === -1 ? second.index : second.template;
  const receivingRecord = new RuleRecord(
    selectors,
    selectors.join(),
    selectorIds
  );
  receivingRecord.mark();
  receivingRecord.template = template;
  receivingRecord.before = second.before;
  // The merged rule takes the place before the later rule, so no rule holds
  // children while it is unlinked. The sweep's replacement keeps that place.
  placeBefore(records, second.index, receivingRecord);
  if (!group) mergeState.storeJoined(receivingRecord, first, second);
  // The merged rule takes the declarations of the earlier rule themselves.
  moveDeclarations(
    records,
    first.index,
    receivingRecord.index,
    shared.map((declaration) => declaration.index)
  );
  const firstLeftover = leftoverOf(records, first);
  removeDeclarations(records, second.index, claimedIndices);
  const secondLeftover = leftoverOf(records, second);
  /** @type {Placement} */
  const placement = {
    first: indicesOf(firstLeftover),
    second: indicesOf(
      [receivingRecord, ...secondLeftover].filter((record) =>
        childCountOf(records, record.index)
      )
    ),
  };
  if (group) {
    placement.following = group.followers.map(({ rule, claimed }) => {
      removeDeclarations(records, rule.index, claimed);
      return indicesOf(leftoverOf(records, rule));
    });
  }
  return placement;
}
