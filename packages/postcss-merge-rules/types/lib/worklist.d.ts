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
export type Candidate = {
    first: import('postcss').Rule;
    second: import('postcss').Rule;
    firstVersion: number;
    secondVersion: number;
    benefit: number;
    firstSourceOrder: number;
    contentKey: string;
};
export type ActiveMeta = {
    version: number;
    sourceOrder: number;
    contentKey: string;
    active: boolean;
    previous: import('postcss').Rule | null;
    next: import('postcss').Rule | null;
};
export type MergeOutcome = {
    rule: import('postcss').Rule;
    replacements: import('postcss').Rule[];
    replaced: import('postcss').Rule[];
    changed: import('postcss').Rule[];
    moved: boolean;
};
export type WorklistApi = {
    active: WeakMap<import('postcss').Rule, ActiveMeta>;
    hasPossibleSharedDeclaration: (first: import('postcss').Rule, second: import('postcss').Rule) => boolean;
    estimatedBenefit: (first: import('postcss').Rule, second: import('postcss').Rule) => number;
    seed: (root: import('postcss').Root) => import('postcss').Rule | null;
    isCurrentCandidate: (candidate: Candidate) => boolean;
    canMerge: (first: import('postcss').Rule, second: import('postcss').Rule) => boolean;
    mergeParents: (first: import('postcss').Rule, second: import('postcss').Rule) => boolean;
    repairMove: (rule: import('postcss').Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void;
    mergeMatchingDeclarations: (first: import('postcss').Rule, second: import('postcss').Rule, enqueueNeighbors: (rule: import('postcss').Rule) => void) => boolean;
    mergeMatchingSelectors: (first: import('postcss').Rule, second: import('postcss').Rule, enqueueNeighbors: (rule: import('postcss').Rule) => void) => boolean;
    captureBoundaries: (rules: import('postcss').Rule[]) => Map<import('postcss').Container, {
        first: import('postcss').Rule | null;
        last: import('postcss').Rule | null;
    }>;
    partialMerge: (first: import('postcss').Rule, second: import('postcss').Rule, onMove: (rule: import('postcss').Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void) => MergeOutcome;
    installPartialMerge: (outcome: MergeOutcome, captured: Map<import('postcss').Container, {
        first: import('postcss').Rule | null;
        last: import('postcss').Rule | null;
    }>, enqueue: (first: import('postcss').Rule | null, second: import('postcss').Rule | null) => void, enqueueNeighbors: (rule: import('postcss').Rule) => void) => boolean;
    refresh: (rule: import('postcss').Rule) => ActiveMeta;
    flush: (rule: import('postcss').Rule) => void;
};
/**
 * Run the incremental merge queue. Rule metadata and merge operations stay in
 * selector-merger.js; this module owns only candidate ordering and invalidation.
 *
 * @param {import('postcss').Root} root
 * @param {WorklistApi} api
 * @return {void}
 */
export default function runWorklist(root: import('postcss').Root, api: WorklistApi): void;
//# sourceMappingURL=worklist.d.ts.map