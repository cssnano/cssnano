import type { Container, Rule } from 'postcss';
import type { RuleMeta } from './rule-meta.js';
/**
 * Joins siblings that apply under the same circumstances across any nodes
 * between them that set no conflicting property, in every container except
 * style rules, whose rules the scan handles.
 *
 * Rules with the same selector set the same properties on the same elements
 * at the same specificity. The later rule moves up into the earlier one or,
 * failing that, the earlier rule moves down into the later one. Joining
 * always shrinks the output because the selector is not repeated.
 *
 * Sibling `@media`, `@supports` or `@container` blocks with identical
 * conditions apply their content under the same circumstances, so a later
 * block joins an earlier one when nothing between them, at any depth, sets a
 * property that its declarations also set. Named `@layer` blocks are left
 * out: their order comes from where each layer first appears.
 *
 * Rules that set the same declarations in the same order also share one
 * rule: a later rule adds its selectors to the earlier one, and is removed,
 * when no node between them sets a property its declarations also set.
 *
 * @param {Container} root
 * @param {(first: Rule, second: Rule) => boolean} canMerge
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @param {WeakSet<Rule>} ruleCache rules whose selectors are known to be compatible
 * @param {import('./rule-meta.js').SelectorLookup} lookup
 * @return {boolean} whether anything was joined
 */
export declare function joinNonAdjacent(root: Container, canMerge: (first: Rule, second: Rule) => boolean, ruleMeta: WeakMap<Rule, RuleMeta>, ruleCache: WeakSet<Rule>, lookup: import('./rule-meta.js').SelectorLookup): boolean;
//# sourceMappingURL=non-adjacent-merge.d.ts.map