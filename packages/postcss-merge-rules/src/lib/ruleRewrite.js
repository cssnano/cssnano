import { declarationIsEqual } from './declarations.js';
import LastWriteIndex from './lastWriteIndex.js';
import { getDecls } from './ruleMeta.js';
import { standInContainer } from './ruleSequence.js';

/** @import {Rule} from 'postcss' */
/** @import {Placement} from './ruleSequence.js' */

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
 * @param {...Rule} rules
 * @return {number}
 */
function ruleLength(...rules) {
  return rules.map((r) => (r.nodes.length ? String(r) : '')).join('').length;
}

/**
 * Splits the declarations both rules set out of them into a rule with both
 * selectors, which takes the place of the later rule, between a leftover of
 * each. A rule left without declarations is dropped.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {Set<number>} claimedEarlierIndices
 * @param {Set<number>} claimedIndices
 * @param {import('./mergeState.js').default} mergeState
 * @return {Placement | null} null when the output would not get shorter
 */
export function buildMergedRule(
  first,
  second,
  claimedEarlierIndices,
  claimedIndices,
  mergeState
) {
  const receivingBlock = second.clone();
  // It stands before `second`, which is where its raws are inferred from.
  standInContainer(receivingBlock, second.parent);
  const firstSelectors = mergeState.meta(first).selectors;
  const secondSelectors = mergeState.meta(second).selectors;
  receivingBlock.selector = [...firstSelectors, ...secondSelectors].join();
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
  if (
    ruleLength(firstClone, receivingBlock, secondClone) >=
    ruleLength(first, second)
  ) {
    return null;
  }
  mergeState.markCompatible(receivingBlock);
  if (secondClone.nodes.length) mergeState.markCompatible(secondClone);
  return {
    first: [firstClone].filter((rule) => rule.nodes.length),
    second: [receivingBlock, secondClone].filter((rule) => rule.nodes.length),
  };
}
