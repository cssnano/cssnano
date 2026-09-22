/** @import {Declaration, Rule} from 'postcss' */
import type { Declaration, Rule } from 'postcss';
export type RuleMeta = {
    selectors: string[];
    declarations: Declaration[];
};
/**
 * @param {Rule} rule
 * @param {WeakMap<Rule, RuleMeta>} [ruleMeta]
 * @return {RuleMeta}
 */
export declare function getMeta(rule: Rule, ruleMeta?: WeakMap<Rule, RuleMeta>): RuleMeta;
/** @param {Rule} rule @return {Declaration[]} */
export declare function getDecls(rule: Rule): Declaration[];
//# sourceMappingURL=rule-meta.d.ts.map