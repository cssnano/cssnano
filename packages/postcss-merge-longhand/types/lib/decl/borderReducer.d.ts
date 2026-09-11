import type { Declaration, Rule } from 'postcss';
/** @param {Rule} rule @param {Declaration[]} declarations */
export declare function isConcreteBorder(rule: Rule, declarations: Declaration[]): boolean;
/** @param {Rule} rule @param {Declaration[]} [declarations] @param {boolean} [hasResetContext] */
export declare function reduceBorder(rule: Rule, declarations?: Declaration[], hasResetContext?: boolean): void;
//# sourceMappingURL=borderReducer.d.ts.map