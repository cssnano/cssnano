export = resolveBorderGrid;
/**
 * The border pipeline gives up on a rule that mixes `border-width`,
 * `border-style` or `border-color` with a per-side property, because its
 * transforms take the declarations a pair at a time and cannot see what the
 * whole set computes to. Resolving them against one grid can, for the one shape
 * where nothing else stands in the way: a `border` reset the plugin may re-emit
 * for free, and plain values after it.
 *
 * This duplicates the pipeline's intent, so it has to stay behind
 * `containsUnmergeableBorderDecls` — the two must never see the same input.
 *
 * @param {Rule} rule
 * @return {void}
 */
declare function resolveBorderGrid(rule: Rule): void;
import type { Rule } from 'postcss';
//# sourceMappingURL=borderGrid.d.ts.map