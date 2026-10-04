import type { Rule } from 'postcss';
import type { RuleMeta } from './rule-meta.js';
/**
 * @param {Rule} ruleA
 * @param {Rule} ruleB
 * @param {import('./rule-meta.js').SelectorLookup} lookup
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {boolean}
 */
export declare function canMerge(ruleA: Rule, ruleB: Rule, lookup: import('./rule-meta.js').SelectorLookup, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>): boolean;
/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {{rule: Rule, replacements: Rule[], replaced: Rule[]}}
 */
export declare function partialMerge(first: Rule, second: Rule, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>): {
    rule: Rule;
    replacements: Rule[];
    replaced: Rule[];
};
//# sourceMappingURL=merge.d.ts.map