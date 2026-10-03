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
 * @property {(rule: import('postcss').Rule) => void} repairMove
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => MutationOutcome | null} mergeMatchingDeclarations
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => MutationOutcome | null} mergeMatchingSelectors
 * @property {(first: import('postcss').Rule, second: import('postcss').Rule) => MergeOutcome} partialMerge
 * @property {(outcome: MergeOutcome) => MutationOutcome | null} installPartialMerge
 * @property {(rule: import('postcss').Rule) => ActiveMeta} refresh
 */
export type Candidate = {
    first: import('postcss').Rule;
    second: import('postcss').Rule;
    firstVersion: number;
    secondVersion: number;
    benefit: number;
    firstSourceOrder: number;
    contentKey: string;
    candidateId: number;
    edgeKey: string;
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
};
export type WorklistApi = {
    active: WeakMap<import('postcss').Rule, ActiveMeta>;
    hasPossibleSharedDeclaration: (first: import('postcss').Rule, second: import('postcss').Rule) => boolean;
    estimatedBenefit: (first: import('postcss').Rule, second: import('postcss').Rule) => number;
    seed: (root: import('postcss').Root) => import('postcss').Rule | null;
    isCurrentCandidate: (candidate: Candidate) => boolean;
    canMerge: (first: import('postcss').Rule, second: import('postcss').Rule) => boolean;
    mergeParents: (first: import('postcss').Rule, second: import('postcss').Rule) => boolean;
    repairMove: (rule: import('postcss').Rule) => void;
    mergeMatchingDeclarations: (first: import('postcss').Rule, second: import('postcss').Rule) => MutationOutcome | null;
    mergeMatchingSelectors: (first: import('postcss').Rule, second: import('postcss').Rule) => MutationOutcome | null;
    partialMerge: (first: import('postcss').Rule, second: import('postcss').Rule) => MergeOutcome;
    installPartialMerge: (outcome: MergeOutcome) => MutationOutcome | null;
    refresh: (rule: import('postcss').Rule) => ActiveMeta;
};
export type MutationOutcome = {
    previous: import('postcss').Rule | null;
    replacements: import('postcss').Rule[];
    next: import('postcss').Rule | null;
    kind: 'equal-declaration' | 'equal-selector' | 'partial';
};
/** @typedef {{previous: import('postcss').Rule | null, replacements: import('postcss').Rule[], next: import('postcss').Rule | null, kind: 'equal-declaration' | 'equal-selector' | 'partial'}} MutationOutcome */
/** @param {Candidate} a @param {Candidate} b */
export declare function comesBefore(a: Candidate, b: Candidate): boolean;
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