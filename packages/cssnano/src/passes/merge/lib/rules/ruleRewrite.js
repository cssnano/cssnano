import postcss from 'postcss';
import { minifiedLength } from '../../../ir/minifiedLength.js';
import { PropertyWrites } from './lastWriteIndex.js';
import { findGroup, selectorsLength } from './sharedRuleGroup.js';
import { depart } from './treeEdits.js';
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */

/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecords.js' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */
/** @import MergeState from './mergeState.js' */

/**
 * A rule with the source's raws, position and selector but no children, so
 * the caller fills it without cloning the source's declarations.
 *
 * @param {import('postcss').Rule} source
 * @param {string} selector
 * @return {import('postcss').Rule}
 */
function shellOf(source, selector) {
  return postcss.rule({
    selector,
    raws: structuredClone(source.raws),
    source: source.source,
  });
}

/**
 * The rules a rule leaves in its place: the rule itself while it keeps a
 * child, and nothing once it holds no child, when it departs. A kept rule
 * needs no report: only a rule that held a declaration in the first round
 * reaches a merge, so the second round already has it.
 *
 * @param {MergeState} mergeState
 * @param {RuleRecord} record
 * @return {RuleRecord[]}
 */
function leftoverOf(mergeState, record) {
  if (!record.childCount()) {
    depart(mergeState, record);
    return [];
  }
  return [record];
}

/**
 * The writes of a rule's declarations, numbered by their position.
 *
 * @param {DeclarationRecord[]} declarations
 * @return {PropertyWrites}
 */
export function writesOf(declarations) {
  // Rewrites compare whole rules and never ask about one element.
  const index = new PropertyWrites();
  for (const [position, declaration] of declarations.entries()) {
    index.record(declaration.keys, position);
  }
  return index;
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
 * @param {Set<number>} claimedEarlierIndices
 * @param {Set<number>} claimedIndices
 * @param {import('./mergeState.js').default} mergeState
 * @param {RuleLink} secondLink where `second` stands in the sweep
 * @param {RuleSequence} sequence
 * @param {WeakMap<BlockRecord, boolean>} outsideDeclarations
 * @return {Placement | null} null when the output would not get shorter
 */
export function buildMergedRule(
  first,
  second,
  claimedEarlierIndices,
  claimedIndices,
  mergeState,
  secondLink,
  sequence,
  outsideDeclarations
) {
  const firstSelectors = first.selectors;
  const secondSelectors = second.selectors;
  const firstDeclarations = first.declarations;
  let sharedBytes = 0;
  // A later plugin, such as Autoprefixer, removes an outdated prefixed
  // declaration from the rule that sets it, which a shared rule leaves alone.
  let prefixed = 0;
  for (const index of claimedEarlierIndices) {
    const declaration = firstDeclarations[index];
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
  if (first.childCount() === claimedEarlierIndices.size) {
    delta -= selectorsLength(firstSelectors) + 1;
  }
  if (second.childCount() === claimedIndices.size) {
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
          claimedEarlierIndices,
          claimedIndices,
          sharedBytes,
          prefixed,
          delta,
          mergeState,
          sequence,
          outsideDeclarations
        );
  if (delta >= 0 && !group) return null;

  const receivingBlock = shellOf(
    second.node,
    [...firstSelectors, ...secondSelectors, ...(group?.added ?? [])].join()
  );
  if (!group) mergeState.storeJoined(receivingBlock, first, second);
  mergeState.reportCreated(receivingBlock);
  // The merged rule takes the declarations of the earlier rule themselves.
  const receivingRecord = mergeState.records.recordRule(receivingBlock, []);
  for (const declaration of first.takeDeclarationsAt(claimedEarlierIndices)) {
    receivingRecord.append(declaration);
  }
  const firstLeftover = leftoverOf(mergeState, first);
  second.removeDeclarationsAt(claimedIndices);
  const secondLeftover = leftoverOf(mergeState, second);
  /** @type {Placement} */
  const placement = {
    first: firstLeftover,
    second: [receivingRecord, ...secondLeftover].filter((record) =>
      record.childCount()
    ),
  };
  if (group) {
    placement.following = group.followers.map(({ rule, claimed }) => {
      rule.removeDeclarationsAt(claimed);
      return leftoverOf(mergeState, rule);
    });
  }
  return placement;
}
