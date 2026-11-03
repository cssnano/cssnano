import postcss from 'postcss';
import { minifiedLength } from '../../../ir/minifiedLength.js';
import { PropertyWrites } from './propertyWrites.js';
import { findGroup, selectorsLength } from './sharedRuleGroup.js';
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */

/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import RuleSequence, {Placement} from './ruleSequence.js' */
/** @import MergeState from './mergeState.js' */

/**
 * @param {RuleRecord[]} records
 * @return {number[]} the index of each rule
 */
function indicesOf(records) {
  return records.map((record) => record.index);
}

/**
 * A rule with the source's raws and position but no selector and no children,
 * so the caller fills it without cloning the source's declarations. Write-back
 * gives it the selector of its record.
 *
 * @param {import('postcss').Rule} source
 * @return {import('postcss').Rule}
 */
function shellOf(source) {
  // The node has no selector yet, which PostCSS's props type does not allow.
  return postcss.rule(
    /** @type {import('postcss').RuleProps} */ ({
      raws: structuredClone(source.raws),
      source: source.source,
    })
  );
}

/**
 * The rules a rule leaves in its place: the rule itself while it keeps a
 * child, and nothing once it holds no child, when it departs. A kept rule
 * needs no report: only a rule that held a declaration in the first round
 * reaches a merge, so the second round already has it.
 *
 * @param {RuleRecord} record
 * @return {RuleRecord[]}
 */
function leftoverOf(record) {
  if (!record.childCount()) {
    record.depart();
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
 * @param {DeclarationRecord[]} shared the shared declarations, in their order in `first`
 * @param {Set<number>} claimedEarlierIndices
 * @param {Set<number>} claimedIndices
 * @param {import('./mergeState.js').default} mergeState
 * @param {number} secondLink the index of `second` in the sweep
 * @param {RuleSequence} sequence
 * @param {Map<number, boolean>} outsideDeclarations
 * @return {Placement | null} null when the output would not get shorter
 */
export function buildMergedRule(
  first,
  second,
  shared,
  claimedEarlierIndices,
  claimedIndices,
  mergeState,
  secondLink,
  sequence,
  outsideDeclarations
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
          shared,
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

  const selectors = [
    ...firstSelectors,
    ...secondSelectors,
    ...(group?.added ?? []),
  ];
  const receivingBlock = shellOf(second.node);
  const receivingRecord = records.recordRule(
    receivingBlock,
    selectors,
    selectors.join()
  );
  receivingRecord.mark();
  if (!group) mergeState.storeJoined(receivingRecord, first, second);
  mergeState.reportCreated(receivingBlock);
  // The merged rule takes the declarations of the earlier rule themselves.
  for (const declaration of records.takeDeclarationsAt(
    first,
    claimedEarlierIndices
  )) {
    records.appendChild(receivingRecord, declaration);
  }
  const firstLeftover = leftoverOf(first);
  records.removeDeclarationsAt(second, claimedIndices);
  const secondLeftover = leftoverOf(second);
  /** @type {Placement} */
  const placement = {
    first: indicesOf(firstLeftover),
    second: indicesOf(
      [receivingRecord, ...secondLeftover].filter((record) =>
        record.childCount()
      )
    ),
  };
  if (group) {
    placement.following = group.followers.map(({ rule, claimed }) => {
      records.removeDeclarationsAt(rule, claimed);
      return indicesOf(leftoverOf(rule));
    });
  }
  return placement;
}
