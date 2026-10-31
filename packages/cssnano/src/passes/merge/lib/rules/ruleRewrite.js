import postcss from 'postcss';
import { minifiedLength } from '../../../ir/minifiedLength.js';
import { inheritSupport } from '../longhand/isFallback.js';
import { PropertyWrites } from './lastWriteIndex.js';
import { findGroup, selectorsLength } from './sharedRuleGroup.js';
import { depart } from './treeEdits.js';
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */

/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecords.js' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */

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
  // The merged rule takes the declarations of the earlier rule themselves.
  const receivingRecord = mergeState.records.recordRule(receivingBlock, []);
  for (const declaration of first.takeDeclarationsAt(claimedEarlierIndices)) {
    receivingRecord.append(declaration);
  }
  const firstLeftover = first.node.clone({ selectors: firstSelectors });
  const secondClone = second.node.clone({ selectors: secondSelectors });
  mergeState.storeClone(first, firstLeftover);
  mergeState.storeClone(second, secondClone);
  mergeState.reportCreated(receivingBlock);
  mergeState.reportCreated(firstLeftover);
  mergeState.reportCreated(secondClone);
  // Index-based removal matches duplicates positionally, symmetric to how
  // `claimedIndices` selects declarations in the later rule. Each clone
  // declaration takes a copy of its source's record, so the keys carry over.
  const firstRecords = first.declarations;
  /** @type {DeclarationRecord[]} */
  const firstKept = [];
  let earlierIndex = 0;
  firstLeftover.walkDecls((decl) => {
    inheritSupport(firstRecords[earlierIndex].node, decl, mergeState.textTable);
    firstKept.push(firstRecords[earlierIndex++].copy(decl));
  });
  const secondRecords = second.declarations;
  /** @type {DeclarationRecord[]} */
  const secondKept = [];
  let laterIndex = 0;
  secondClone.walkDecls((decl) => {
    inheritSupport(secondRecords[laterIndex].node, decl, mergeState.textTable);
    const copy = secondRecords[laterIndex].copy(decl);
    if (claimedIndices.has(laterIndex++)) {
      decl.remove();
    } else {
      secondKept.push(copy);
    }
  });
  // The clones hold their final declarations, so their records are built now.
  const firstRecord = mergeState.records.recordRule(firstLeftover, firstKept);
  const secondRecord = mergeState.records.recordRule(secondClone, secondKept);
  /** @type {Placement} */
  const placement = {
    first: [firstRecord].filter((record) => record.childCount()),
    second: [receivingRecord, secondRecord].filter((record) =>
      record.childCount()
    ),
  };
  if (group) {
    placement.following = group.followers.map(({ rule, claimed }) => {
      const leftover = rule.node.clone({ selectors: rule.selectors });
      mergeState.storeClone(rule, leftover);
      mergeState.reportCreated(leftover);
      const records = rule.declarations;
      depart(mergeState, rule);
      /** @type {DeclarationRecord[]} */
      const kept = [];
      let index = 0;
      leftover.walkDecls((decl) => {
        inheritSupport(records[index].node, decl, mergeState.textTable);
        const copy = records[index].copy(decl);
        if (claimed.has(index++)) decl.remove();
        else kept.push(copy);
      });
      const leftoverRecord = mergeState.records.recordRule(leftover, kept);
      if (!leftoverRecord.childCount()) return [];
      return [leftoverRecord];
    });
  }
  return placement;
}
