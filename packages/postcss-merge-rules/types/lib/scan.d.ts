import type { Root, Rule } from 'postcss';
import type { RuleMeta } from './rule-meta.js';
export type ScanOperations = {
    canMerge: (first: Rule, second: Rule) => boolean;
    mergeParents: (first: Rule, second: Rule) => boolean;
    mergeMatchingDeclarations: (first: Rule, second: Rule) => Rule[] | null;
    mergeMatchingSelectors: (first: Rule, second: Rule) => Rule[] | null;
    partialMerge: (first: Rule, second: Rule) => Rule[];
    ruleMeta: WeakMap<Rule, RuleMeta>;
};
export type RuleProfile = {
    meta: RuleMeta;
    ids: number[];
    idSet: Set<number>;
};
/** @import {ChildNode, Container, Declaration, Node, Root, Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */
/**
 * @typedef {Object} ScanOperations
 * @property {(first: Rule, second: Rule) => boolean} canMerge
 * @property {(first: Rule, second: Rule) => boolean} mergeParents
 * @property {(first: Rule, second: Rule) => Rule[] | null} mergeMatchingDeclarations
 * @property {(first: Rule, second: Rule) => Rule[] | null} mergeMatchingSelectors
 * @property {(first: Rule, second: Rule) => Rule[]} partialMerge
 * @property {WeakMap<Rule, RuleMeta>} ruleMeta
 */
/**
 * @typedef {object} RuleProfile
 * @property {RuleMeta} meta
 * @property {number[]} ids
 * @property {Set<number>} idSet
 */
/**
 * Rule profiles for every run of the scan over one stylesheet. A profile is
 * keyed by the rule's metadata. Joins delete it for a rule whose declarations
 * they edit; a rule that only gains selectors keeps it, and the profile reads
 * the selectors through the metadata, so it stays current.
 *
 * @return {{profiles: WeakMap<RuleMeta, RuleProfile>, declarationIds: Map<string, number>}}
 */
export declare function createProfileCache(): {
    profiles: WeakMap<RuleMeta, RuleProfile>;
    declarationIds: Map<string, number>;
};
export type RuleLink = {
    rule: Rule;
    prev: RuleLink | null;
    next: RuleLink | null;
};
/**
 * Merges neighboring rules in left-to-right sweeps, trying the pair that
 * shares the most declarations first and the earlier pair on a tie. That
 * approximates merging the best pair of the whole stylesheet first. The two
 * orders give the same output on the framework corpus but not on every input.
 *
 * Termination: a rewrite either shortens the output or moves a rule into the
 * parent of an earlier rule with an equivalent parent, and replacements stay
 * where they are. Neither the length nor the positions can recur, so the
 * sweeps stop once one moves no rule.
 *
 * @param {Root} root
 * @param {ScanOperations} operations
 * @param {ReturnType<typeof createProfileCache>} [cache]
 * @return {void}
 */
export default function runScan(root: Root, operations: ScanOperations, cache?: ReturnType<typeof createProfileCache>): void;
//# sourceMappingURL=scan.d.ts.map