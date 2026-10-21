import { createRunContext } from '../../../ir/runContext.js';
import MergeState from './mergeState.js';
import { joinNonAdjacent } from './nonAdjacentMerge.js';
import runScan from './scan.js';

/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './ruleMeta.js' */

/**
 * @param {import('postcss').Root} root
 * @param {readonly string[]} browsers
 * @param {Map<string, import('./ensureCompatibility.js').SelectorInfo>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
 * @return void
 */
export default function runMerge(
  root,
  browsers,
  compatibilityCache,
  ruleCache,
  ruleMeta,
  context = createRunContext()
) {
  // The scan runs first because a join by selector can remove a
  // shared declaration that would have merged more selectors. Its merges
  // can leave same-selector rules apart, so the joins repeat until none apply.
  //
  // Rounds: at most N + D + 1, for N rules and at-rules and D declarations
  // at the start. A round after the first needs a join that removed a node
  // or withdrew at least one declaration. No rewrite adds a declaration. A
  // partial merge is the only rewrite that adds a node, one net, and it
  // removes at least one declaration, as does a trimming join. So at most D
  // rewrites add a node or withdraw a declaration, and at most N + D joins
  // remove a node or withdraw one. The bound on sweeps per round is open
  // (see `runScan`), so the cost of the whole loop is not bounded in N.
  const mergeState = new MergeState(
    browsers,
    compatibilityCache,
    ruleCache,
    ruleMeta,
    context
  );
  do {
    runScan(root, mergeState);
  } while (joinNonAdjacent(root, mergeState));
}
