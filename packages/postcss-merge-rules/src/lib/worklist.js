/** @typedef {{first: import('postcss').Rule, second: import('postcss').Rule, firstVersion: number, secondVersion: number, benefit: number, firstSourceOrder: number, contentKey: string}} Candidate */
/** @typedef {{version: number, sourceOrder: number, contentKey: string, active: boolean, previous: import('postcss').Rule | null, next: import('postcss').Rule | null}} ActiveMeta */
/** @typedef {{rule: import('postcss').Rule, replacements: import('postcss').Rule[], replaced: import('postcss').Rule[], changed: import('postcss').Rule[], moved: boolean}} MergeOutcome */
/** @typedef {Object} WorklistApi
 * @property {WeakMap<import('postcss').Rule, ActiveMeta>} active
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => boolean} hasPossibleSharedDeclaration
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => number} estimatedBenefit
 * @property {(root: import('postcss').Root) => import('postcss').Rule | null} seed
 * @property {(candidate: Candidate) => boolean} isCurrentCandidate
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => boolean} canMerge
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => boolean} mergeParents
 * @property {(rule: import('postcss').Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void} repairMove
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule, enqueueNeighbors: (rule: import('postcss').Rule) => void) => boolean} mergeMatchingDeclarations
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule, enqueueNeighbors: (rule: import('postcss').Rule) => void) => boolean} mergeMatchingSelectors
 * @property {(rules: import('postcss').Rule[]) => Map<import('postcss').Container, {first: import('postcss').Rule | null, last: import('postcss').Rule | null}>} captureBoundaries
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule, onMove: (rule: import('postcss').Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void) => MergeOutcome} partialMerge
 * @property {(outcome: MergeOutcome, captured: Map<import('postcss').Container, {first: import('postcss').Rule | null, last: import('postcss').Rule | null}>, enqueue: (first: import('postcss').Rule | null, second: import('postcss').Rule | null) => void, enqueueNeighbors: (rule: import('postcss').Rule) => void) => boolean} installPartialMerge
 * @property {(rule: import('postcss').Rule) => ActiveMeta} refresh
 * @property {(rule: import('postcss').Rule) => void} flush
 */

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

  /** @param {Candidate} a @param {Candidate} b */
  // The comparator stays local with the heap's candidate type and ordering contract.
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const comesBefore = (a, b) => {
    if (a.benefit !== b.benefit) return a.benefit > b.benefit;
    if (a.firstSourceOrder !== b.firstSourceOrder) {
      return a.firstSourceOrder < b.firstSourceOrder;
    }
    return a.contentKey < b.contentKey;
  };

  /** @param {Candidate} candidate */
  const pushCandidate = (candidate) => {
    let index = candidates.length;
    candidates.push(candidate);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (comesBefore(candidates[parent], candidate)) break;
      candidates[index] = candidates[parent];
      index = parent;
    }
    candidates[index] = candidate;
  };

  const popCandidate = () => {
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
    if (!first || !second || !api.hasPossibleSharedDeclaration(first, second))
      return;
    const firstMeta = api.active.get(first);
    const secondMeta = api.active.get(second);
    if (!firstMeta || !secondMeta) return;
    pushCandidate({
      first,
      second,
      firstVersion: firstMeta.version,
      secondVersion: secondMeta.version,
      benefit: api.estimatedBenefit(first, second),
      firstSourceOrder: firstMeta.sourceOrder,
      contentKey: `${firstMeta.contentKey}|${secondMeta.contentKey}`,
    });
  };

  /** @param {import('postcss').Rule} rule */
  const enqueueNeighbors = (rule) => {
    const meta = api.active.get(rule);
    if (!meta?.active) return;
    enqueue(meta.previous, rule);
    enqueue(rule, meta.next);
  };

  const reseedCandidates = () => {
    candidates = [];
    const initialRule = api.seed(root);
    for (
      let rule = initialRule;
      rule;
      rule = api.active.get(rule)?.next ?? null
    ) {
      enqueue(rule, api.active.get(rule)?.next ?? null);
    }
  };

  reseedCandidates();
  while (candidates.length || needsGlobalReseed) {
    if (!candidates.length) {
      needsGlobalReseed = false;
      reseedCandidates();
      if (!candidates.length) break;
    }
    const candidate = popCandidate();
    const first = candidate.first;
    const second = candidate.second;
    if (!api.isCurrentCandidate(candidate)) continue;
    if (!api.canMerge(first, second)) continue;

    // Equivalent at-rule moves preserve depth-first leaf-rule order.
    const oldParent = second.parent;
    const newParent = first.parent;
    const moved = api.mergeParents(first, second);
    if (moved && oldParent && newParent)
      api.repairMove(second, oldParent, newParent);
    if (api.mergeMatchingDeclarations(first, second, enqueueNeighbors))
      continue;
    if (api.mergeMatchingSelectors(first, second, enqueueNeighbors)) continue;

    const replacedRules = [first, second];
    const capturedBoundaries = api.captureBoundaries(replacedRules);
    const outcome = api.partialMerge(
      first,
      second,
      (rule, movedFrom, movedTo) => api.repairMove(rule, movedFrom, movedTo)
    );
    if (outcome.replacements.length) {
      needsGlobalReseed =
        api.installPartialMerge(
          outcome,
          capturedBoundaries,
          enqueue,
          enqueueNeighbors
        ) || needsGlobalReseed;
    } else if (moved || outcome.moved) {
      for (const changed of [first, second, ...outcome.changed]) {
        api.refresh(changed);
        enqueueNeighbors(changed);
      }
      needsGlobalReseed = true;
    }
  }
  root.walkRules((rule) => api.flush(rule));
}
