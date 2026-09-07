import type { Rule } from 'postcss';
import type { RuleMeta } from './rule-meta.js';
/**
 * @param {Rule} ruleA
 * @param {Rule} ruleB
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {boolean}
 */
export declare function canMerge(ruleA: Rule, ruleB: Rule, browsers: string[], compatibilityCache: Map<string, boolean>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>): boolean;
/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @param {(rule: Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void} [onMove]
 * @return {{rule: Rule, replacements: Rule[], replaced: Rule[], changed: Rule[], moved: boolean}}
 */
export declare function partialMerge(first: Rule, second: Rule, browsers: string[], compatibilityCache: Map<string, boolean>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>, onMove?: (rule: Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void): {
    rule: Rule;
    replacements: Rule[];
    replaced: Rule[];
    changed: Rule[];
    moved: boolean;
};
//# sourceMappingURL=merge.d.ts.map