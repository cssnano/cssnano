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
 * @param {(rule: Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void} [onMove]
 * @return {{first: Rule, second: Rule, intersection: Declaration[], moved: boolean}}
 */
export declare function mergeWithNextRule(first: Rule, second: Rule, intersection: Declaration[], browsers: string[], compatibilityCache: Map<string, boolean>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, import('./rule-meta.js').RuleMeta>, canMerge: (a: Rule, b: Rule, browsers: string[], compatibilityCache: Map<string, boolean>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, import('./rule-meta.js').RuleMeta>) => boolean, onMove?: (rule: Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void): {
    first: Rule;
    second: Rule;
    intersection: Declaration[];
    moved: boolean;
};
/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {Declaration[]} intersection
 * @param {Set<number>} claimedIndices
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, import('./rule-meta.js').RuleMeta>} ruleMeta
 * @return {{rule: Rule, replacements: Rule[]}}
 */
export declare function buildMergedRule(first: Rule, second: Rule, intersection: Declaration[], claimedIndices: Set<number>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, import('./rule-meta.js').RuleMeta>): {
    rule: Rule;
    replacements: Rule[];
};
//# sourceMappingURL=rule-rewrite.d.ts.map