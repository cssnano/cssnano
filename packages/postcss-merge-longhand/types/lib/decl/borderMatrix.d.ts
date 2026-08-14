export = resolveBorderGrid;
/**
 * This duplicates the main pipeline's intent for one case it can't otherwise
 * merge (a `border` reset followed by plain values), so it must stay guarded
 * by `containsUnmergeableBorderDecls` to avoid double-handling input.
 *
 * @param {Rule} rule
 * @return {void}
 */
declare function resolveBorderGrid(rule: Rule): void;
import type { Rule } from 'postcss';
//# sourceMappingURL=borderMatrix.d.ts.map