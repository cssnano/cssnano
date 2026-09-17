/** @typedef {{first: import('postcss').Rule, second: import('postcss').Rule, firstVersion: number, secondVersion: number, benefit: number, firstSourceOrder: number, contentKey: string, candidateId: number, edgeKey: string}} Candidate */
/** @typedef {{version: number, sourceOrder: number, contentKey: string, active: boolean, previous: import('postcss').Rule | null, next: import('postcss').Rule | null}} ActiveMeta */
/** @typedef {{rule: import('postcss').Rule, replacements: import('postcss').Rule[], replaced: import('postcss').Rule[]}} MergeOutcome */
/** @typedef {Object} WorklistApi
 * @property {WeakMap<import('postcss').Rule, ActiveMeta>} active
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => boolean} hasPossibleSharedDeclaration
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => number} estimatedBenefit
 * @property {(root: import('postcss').Root) => import('postcss').Rule | null} seed
 * @property {(candidate: Candidate) => boolean} isCurrentCandidate
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => boolean} canMerge
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => boolean} mergeParents
 * @property {(rule: import('postcss').Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void} repairMove
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => MutationOutcome | null} mergeMatchingDeclarations
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => MutationOutcome | null} mergeMatchingSelectors
 * @property {(rules: import('postcss').Rule[]) => Map<import('postcss').Container, {first: import('postcss').Rule | null, last: import('postcss').Rule | null}>} captureBoundaries
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => MergeOutcome} partialMerge
 * @property {(outcome: MergeOutcome, captured: Map<import('postcss').Container, {first: import('postcss').Rule | null, last: import('postcss').Rule | null}>, movedAcrossParents: boolean) => MutationOutcome | null} installPartialMerge
 * @property {(rule: import('postcss').Rule) => ActiveMeta} refresh
 */

/** @typedef {{previous: import('postcss').Rule | null, replacements: import('postcss').Rule[], next: import('postcss').Rule | null, movedAcrossParents: boolean, kind: 'equal-declaration' | 'equal-selector' | 'partial'}} MutationOutcome */

/** @param {Candidate} a @param {Candidate} b */
export function comesBefore(a, b) {
  if (a.benefit !== b.benefit) return a.benefit > b.benefit;
  if (a.firstSourceOrder !== b.firstSourceOrder) {
    return a.firstSourceOrder < b.firstSourceOrder;
  }
  if (a.contentKey !== b.contentKey) return a.contentKey < b.contentKey;
  return a.candidateId < b.candidateId;
}

/**
 * Run the incremental merge queue. Rule metadata and merge operations stay in
 * selector-merger.js; this module owns only candidate ordering and invalidation.
 *
 * @param {import('postcss').Root} root
 * @param {WorklistApi} api
 * @return {void}
 */
export default function runWorklist(root, api) {
  /** @type {Candidate[]} */
  let candidates = [];
  let needsGlobalReseed = false;
  let nextCandidateId = 0;
  let nextRuleId = 0;
  /** @type {WeakMap<import('postcss').Rule, number>} */
  const ruleIds = new WeakMap();
  const queuedEdges = new Set();
  const stats = {
    initialSeeds: 0,
    localEdgesConsidered: 0,
    localEdgesQueued: 0,
    globalReseeds: 0,
    candidatePushes: 0,
    candidatePops: 0,
    peakHeapSize: 0,
    staleCandidateRejections: 0,
    duplicateEdgeSuppressions: 0,
    canMergeCalls: 0,
    successfulEqualDeclarationRewrites: 0,
    successfulEqualSelectorRewrites: 0,
    successfulPartialRewrites: 0,
    crossParentMoves: 0,
  };

  /** @param {import('postcss').Rule} rule */
  const getRuleId = (rule) => {
    let id = ruleIds.get(rule);
    if (id === undefined) {
      id = nextRuleId++;
      ruleIds.set(rule, id);
    }
    return id;
  };

  /** @param {Candidate} candidate */
  const pushCandidate = (candidate) => {
    stats.candidatePushes++;
    let index = candidates.length;
    candidates.push(candidate);
    stats.peakHeapSize = Math.max(stats.peakHeapSize, candidates.length);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (comesBefore(candidates[parent], candidate)) break;
      candidates[index] = candidates[parent];
      index = parent;
    }
    candidates[index] = candidate;
  };

  const popCandidate = () => {
    stats.candidatePops++;
    const candidate = candidates[0];
    const last = candidates.pop();
    if (last && candidates.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        if (left >= candidates.length) break;
        let child = left;
        const right = left + 1;
        if (
          right < candidates.length &&
          comesBefore(candidates[right], candidates[left])
        )
          child = right;
        if (!comesBefore(candidates[child], last)) break;
        candidates[index] = candidates[child];
        index = child;
      }
      candidates[index] = last;
    }
    return candidate;
  };

  /** @param {import('postcss').Rule | null} first @param {import('postcss').Rule | null} second */
  const enqueue = (first, second) => {
    stats.localEdgesConsidered++;
    if (!first || !second || !api.hasPossibleSharedDeclaration(first, second))
      return;
    const firstMeta = api.active.get(first);
    const secondMeta = api.active.get(second);
    if (!firstMeta || !secondMeta) return;
    const edgeKey = `${getRuleId(first)}:${firstMeta.version}|${getRuleId(second)}:${secondMeta.version}`;
    if (queuedEdges.has(edgeKey)) {
      stats.duplicateEdgeSuppressions++;
      return;
    }
    queuedEdges.add(edgeKey);
    stats.localEdgesQueued++;
    pushCandidate({
      first,
      second,
      firstVersion: firstMeta.version,
      secondVersion: secondMeta.version,
      benefit: api.estimatedBenefit(first, second),
      firstSourceOrder: firstMeta.sourceOrder,
      contentKey: `${firstMeta.contentKey}|${secondMeta.contentKey}`,
      candidateId: nextCandidateId++,
      edgeKey,
    });
  };

  /** @param {import('postcss').Rule | null} previous @param {import('postcss').Rule[]} replacements @param {import('postcss').Rule | null} next */
  const enqueueSegment = (previous, replacements, next) => {
    let prior = previous;
    for (const replacement of replacements) {
      enqueue(prior, replacement);
      prior = replacement;
    }
    enqueue(prior, next);
  };

  const reseedCandidates = (initial = false) => {
    candidates = [];
    if (initial) stats.initialSeeds++;
    else stats.globalReseeds++;
    const initialRule = api.seed(root);
    for (
      let rule = initialRule;
      rule;
      rule = api.active.get(rule)?.next ?? null
    ) {
      enqueue(rule, api.active.get(rule)?.next ?? null);
    }
  };

  /** @param {Candidate} candidate @return {boolean} */
  const processCandidate = (candidate) => {
    const first = candidate.first;
    const second = candidate.second;
    if (!api.isCurrentCandidate(candidate)) {
      stats.staleCandidateRejections++;
      return false;
    }
    stats.canMergeCalls++;
    if (!api.canMerge(first, second)) return false;

    // Equivalent at-rule moves preserve depth-first leaf-rule order.
    const oldParent = second.parent;
    const newParent = first.parent;
    const moved = api.mergeParents(first, second);
    if (moved) stats.crossParentMoves++;
    if (moved && oldParent && newParent)
      api.repairMove(second, oldParent, newParent);

    const declarationMutation = api.mergeMatchingDeclarations(first, second);
    if (declarationMutation) {
      enqueueSegment(
        declarationMutation.previous,
        declarationMutation.replacements,
        declarationMutation.next
      );
      stats.successfulEqualDeclarationRewrites++;
      return declarationMutation.movedAcrossParents || moved;
    }

    const selectorMutation = api.mergeMatchingSelectors(first, second);
    if (selectorMutation) {
      enqueueSegment(
        selectorMutation.previous,
        selectorMutation.replacements,
        selectorMutation.next
      );
      stats.successfulEqualSelectorRewrites++;
      return selectorMutation.movedAcrossParents || moved;
    }

    const replacedRules = [first, second];
    const capturedBoundaries = api.captureBoundaries(replacedRules);
    const outcome = api.partialMerge(first, second);
    if (outcome.replacements.length) {
      const mutation = api.installPartialMerge(
        outcome,
        capturedBoundaries,
        moved
      );
      if (mutation) {
        enqueueSegment(mutation.previous, mutation.replacements, mutation.next);
        if (mutation.kind === 'partial') stats.successfulPartialRewrites++;
        return mutation.movedAcrossParents || moved;
      }
    } else if (moved) {
      for (const changed of [first, second]) {
        const refreshed = api.refresh(changed);
        enqueueSegment(refreshed.previous, [changed], refreshed.next);
      }
      return true;
    }
    return false;
  };

  reseedCandidates(true);
  while (candidates.length || needsGlobalReseed) {
    if (!candidates.length) {
      needsGlobalReseed = false;
      reseedCandidates();
      if (!candidates.length) break;
    }
    needsGlobalReseed = processCandidate(popCandidate()) || needsGlobalReseed;
  }

  if (
    typeof process !== 'undefined' &&
    process.env.CSSNANO_MERGE_RULES_STATS !== undefined
  ) {
    console.error(`postcss-merge-rules stats ${JSON.stringify(stats)}`);
  }
}
