import type { Container, Declaration, Rule } from 'postcss';
import type { RuleMeta } from './rule-meta.js';
export type Group = {
    rule: Rule;
    position: number;
    declarations: Declaration[];
    ids: string[];
    /**
     * listed selectors, built on demand
     */
    selectors: Set<string> | null;
    /**
     * declaration bytes, each with its separator, or -1
     */
    bytes: number;
};
/**
 * A later rule that repeats all declarations of an earlier rule adds its
 * selectors to that rule, and gives up the repeated declarations, when no
 * node between them sets a property they also set: the earlier rule then
 * applies the declarations to the same elements as before. The earlier
 * rule, the group, keeps its position and its declarations, so it can take
 * further rules.
 *
 * @param {Container} parent
 * @param {(first: Rule, second: Rule) => boolean} canMerge
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @param {WeakSet<Rule>} ruleCache
 * @param {import('./rule-meta.js').SelectorLookup} lookup
 * @return {boolean}
 */
export default function joinByDeclarations(parent: Container, canMerge: (first: Rule, second: Rule) => boolean, ruleMeta: WeakMap<Rule, RuleMeta>, ruleCache: WeakSet<Rule>, lookup: import('./rule-meta.js').SelectorLookup): boolean;
//# sourceMappingURL=declaration-join.d.ts.map