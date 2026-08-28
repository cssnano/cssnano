import type { Declaration, Rule } from 'postcss';
/** @import {Declaration, Rule} from 'postcss' */
/**
 * @param {Rule} first
 * @param {Rule} second
 * @return {boolean}
 */
export declare function mergeParents(first: Rule, second: Rule): boolean;
/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {Declaration[]} intersection
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, import('./rule-meta.js').RuleMeta>} ruleMeta
 * @param {(a: Rule, b: Rule, browsers: string[], compatibilityCache: Map<string, boolean>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, import('./rule-meta.js').RuleMeta>) => boolean} canMerge
 * @return {{first: Rule, second: Rule, intersection: Declaration[]}}
 */
export declare function mergeWithNextRule(first: Rule, second: Rule, intersection: Declaration[], browsers: string[], compatibilityCache: Map<string, boolean>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, import('./rule-meta.js').RuleMeta>, canMerge: (a: Rule, b: Rule, browsers: string[], compatibilityCache: Map<string, boolean>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, import('./rule-meta.js').RuleMeta>) => boolean): {
    first: Rule;
    second: Rule;
    intersection: Declaration[];
};
/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {Declaration[]} intersection
 * @param {Set<number>} claimedIndices
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, import('./rule-meta.js').RuleMeta>} ruleMeta
 * @return {Rule}
 */
export declare function buildMergedRule(first: Rule, second: Rule, intersection: Declaration[], claimedIndices: Set<number>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, import('./rule-meta.js').RuleMeta>): Rule;
//# sourceMappingURL=rule-rewrite.d.ts.map