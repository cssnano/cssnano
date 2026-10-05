import { declarationIsEqual } from './declarations.js';
import LastWriteIndex from './lastWriteIndex.js';
import { getDecls } from './ruleMeta.js';
import { findGroup, selectorsLength } from './sharedRuleGroup.js';

/** @import {Container, Declaration, Rule} from 'postcss' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */

/**
 * Appends the content of `incoming` to `receiving`. A declaration of
 * `incoming` is redundant only when the last declaration of `receiving` that
 * can set the same property already has an identical value. Otherwise it
 * revives an overridden value or overrides intermediate declarations, so
 * appending it is required to preserve the cascade result.
 *
 * @param {Rule} receiving
 * @param {Rule} incoming
 * @return {void}
 */
export function appendDeclarations(receiving, incoming) {
  const kept = getDecls(receiving);
  const index = new LastWriteIndex();
  for (const [position, declaration] of kept.entries()) {
    index.record(declaration, position);
  }
  for (const node of incoming.nodes.slice()) {
    if (node.type === 'decl') {
      const last = index.lastConflict(node);
      if (last !== -1 && declarationIsEqual(kept[last], node)) {
        node.remove();
        continue;
      }
      index.record(node, kept.length);
      kept.push(node);
    }
    receiving.append(node);
  }
}

/**
 * The bytes a declaration takes in minified output, with the separator after
 * it. A rule adds its braces and drops the last separator, so it takes the
 * length of its selector list, one byte, and its declarations.
 *
 * @param {Declaration} declaration
 * @return {number}
 */
function declarationLength(declaration) {
  return (
    declaration.prop.length +
    declaration.value.length +
    (declaration.important ? 10 : 0) +
    2
  );
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
 * @param {WeakMap<Container, boolean>} outsideDeclarations
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
    const length = declarationLength(declaration);
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
  receivingBlock.nodes = [];
  const firstClone = first.clone({ selectors: firstSelectors });
  const secondClone = second.clone({ selectors: secondSelectors });
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
  mergeState.markCompatible(receivingBlock);
  if (secondClone.nodes.length) mergeState.markCompatible(secondClone);
  /** @type {Placement} */
  const placement = {
    first: [firstClone].filter((rule) => rule.nodes.length),
    second: [receivingBlock, secondClone].filter((rule) => rule.nodes.length),
  };
  if (group) {
    placement.following = group.followers.map(({ rule, claimed }) => {
      const leftover = rule.clone({
        selectors: mergeState.meta(rule).selectors,
      });
      mergeState.forget(rule);
      let index = 0;
      leftover.walkDecls((decl) => {
        if (claimed.has(index++)) decl.remove();
      });
      if (!leftover.nodes.length) return [];
      mergeState.markCompatible(leftover);
      return [leftover];
    });
  }
  return placement;
}
