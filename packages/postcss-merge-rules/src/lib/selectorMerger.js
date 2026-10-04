import MergeState from './mergeState.js';
import { joinNonAdjacent } from './nonAdjacentMerge.js';
import runScan from './scan.js';

/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './ruleMeta.js' */

/**
 * @param {import('postcss').Root} root
 * @param {string[]} browsers
 * @param {Map<string, import('./ensureCompatibility.js').SelectorInfo>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return void
 */
export default function runMerge(
  root,
  browsers,
  compatibilityCache,
  ruleCache,
  ruleMeta
) {
  // The scan runs first because a join by selector can remove a
  // shared declaration that would have merged more selectors. Its merges
  // can leave same-selector rules apart, so the joins repeat until none apply.
  const mergeState = new MergeState(
    browsers,
    compatibilityCache,
    ruleCache,
    ruleMeta
  );
  do {
    runScan(root, mergeState);
  } while (joinNonAdjacent(root, mergeState));
}
