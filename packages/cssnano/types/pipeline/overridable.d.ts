import type { AtRule } from 'postcss';
/**
 * Whether an at-rule is overridable and no at-rule around it is. The walk
 * collects only these, as the old plugin never visited an overridable at-rule
 * inside another.
 *
 * @param {AtRule} atRule
 * @return {boolean}
 */
export declare function isOutermostOverridable(atRule: AtRule): boolean;
/**
 * Removes each overridable at-rule that a later one in its scope overrides. The
 * list is in document order, and it is read backwards, so the winning rule of
 * each scope is seen first.
 *
 * @param {readonly AtRule[]} overridable the outermost overridable at-rules, in document order
 * @return {Set<AtRule> | null} the at-rules removed, or null when none was
 */
export declare function discardOverriddenAtRules(overridable: readonly AtRule[]): Set<AtRule> | null;
//# sourceMappingURL=overridable.d.ts.map