import { minifiedLength } from '../../../ir/minifiedLength.js';
import { PropertyWrites } from './lastWriteIndex.js';
import { findGroup, selectorsLength } from './sharedRuleGroup.js';
import { depart } from './treeEdits.js';
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */

/** @import {Declaration, Rule} from 'postcss' */
/** @import {BlockRecord} from './blockRecords.js' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */

/**
 * The writes of a rule's declarations, numbered by their position.
 *
 * @param {Declaration[]} declarations
 * @param {PropertyTable} table
 * @return {PropertyWrites}
 */
export function writesOf(declarations, table) {
  // Rewrites compare whole rules and never ask about one element, so a plain
  // property table is enough.
  const index = new PropertyWrites(table);
  for (const [position, declaration] of declarations.entries()) {
    index.record(declaration, position);
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
 * @param {Rule} first
 * @param {Rule} second
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
  const firstSelectors = mergeState.meta(first).selectors;
  const secondSelectors = mergeState.meta(second).selectors;
  const firstDeclarations = mergeState.meta(first).declarations;
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
  if (first.nodes.length === claimedEarlierIndices.size) {
    delta -= selectorsLength(firstSelectors) + 1;
  }
  if (second.nodes.length === claimedIndices.size) {
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

  const receivingBlock = second.clone();
  receivingBlock.selector = [
    ...firstSelectors,
    ...secondSelectors,
    ...(group?.added ?? []),
  ].join();
  if (!group) mergeState.storeJoined(receivingBlock, first, second);
  receivingBlock.nodes = [];
  const firstClone = first.clone({ selectors: firstSelectors });
  const secondClone = second.clone({ selectors: secondSelectors });
  mergeState.storeClone(first, firstClone);
  mergeState.storeClone(second, secondClone);
  mergeState.reportCreated(receivingBlock);
  mergeState.reportCreated(firstClone);
  mergeState.reportCreated(secondClone);
  // Index-based removal matches duplicates positionally, symmetric to how
  // `claimedIndices` selects declarations in the later rule.
  let earlierIndex = 0;
  firstClone.walkDecls((decl) => {
    if (claimedEarlierIndices.has(earlierIndex++)) {
      decl.remove();
      receivingBlock.append(decl);
    }
  });
  let laterIndex = 0;
  secondClone.walkDecls((decl) => {
    if (claimedIndices.has(laterIndex++)) {
      decl.remove();
    }
  });
  // The clones hold their final declarations, so their records are built now.
  const receivingRecord = mergeState.records.recordRule(receivingBlock);
  const firstRecord = mergeState.records.recordRule(firstClone);
  const secondRecord = mergeState.records.recordRule(secondClone);
  /** @type {Placement} */
  const placement = {
    first: [firstRecord].filter((record) => record.node.nodes.length),
    second: [receivingRecord, secondRecord].filter(
      (record) => record.node.nodes.length
    ),
  };
  if (group) {
    placement.following = group.followers.map(({ rule, claimed }) => {
      const leftover = rule.clone({
        selectors: mergeState.meta(rule).selectors,
      });
      mergeState.storeClone(rule, leftover);
      mergeState.reportCreated(leftover);
      depart(mergeState, mergeState.meta(rule));
      let index = 0;
      leftover.walkDecls((decl) => {
        if (claimed.has(index++)) decl.remove();
      });
      const leftoverRecord = mergeState.records.recordRule(leftover);
      if (!leftover.nodes.length) return [];
      return [leftoverRecord];
    });
  }
  return placement;
}
