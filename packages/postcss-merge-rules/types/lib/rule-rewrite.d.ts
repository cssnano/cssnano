import type { Rule } from 'postcss';
/** @import {Rule} from 'postcss' */
/**
 * @param {Rule} first
 * @param {Rule} second
 * @return {boolean}
 */
export declare function mergeParents(first: Rule, second: Rule): boolean;
/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {Set<number>} claimedEarlierIndices
 * @param {Set<number>} claimedIndices
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, import('./rule-meta.js').RuleMeta>} ruleMeta
 * @return {{rule: Rule, replacements: Rule[]}}
 */
export declare function buildMergedRule(first: Rule, second: Rule, claimedEarlierIndices: Set<number>, claimedIndices: Set<number>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, import('./rule-meta.js').RuleMeta>): {
    rule: Rule;
    replacements: Rule[];
};
//# sourceMappingURL=rule-rewrite.d.ts.map