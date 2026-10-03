import type { Rule } from 'postcss';
/**
 * Moves `second` into the parent of `first`. A conditional group rule it
 * leaves empty applies nothing, so it is removed; keeping it would make every
 * later pair walk across it.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @return {boolean}
 */
export declare function mergeParents(first: Rule, second: Rule): boolean;
/**
 * Appends the content of `incoming` to `receiving`. A declaration of
 * `incoming` is redundant only when the last declaration of `receiving` that
 * can set the same property already has an identical value. Otherwise it
 * revives an overridden value or overrides intermediate declarations, so
 * appending it is required to preserve the cascade result.
 *
 * @param {Rule} receiving
 * @param {Rule} incoming
 * @return {void}
 */
export declare function appendDeclarations(receiving: Rule, incoming: Rule): void;
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