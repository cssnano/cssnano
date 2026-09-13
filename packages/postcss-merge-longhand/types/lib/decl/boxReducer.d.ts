export declare const physicalMarginProperties: Set<string>;
export declare const physicalPaddingProperties: Set<string>;
import type { Declaration, Rule } from 'postcss';
/** @param {Rule} rule @param {string} prop @param {Declaration[]} [declarations] @param {[Declaration[], Declaration[]]} [lanes] */
export declare function reduceBox(rule: Rule, prop: string, declarations?: Declaration[], lanes?: [Declaration[], Declaration[]]): void;
//# sourceMappingURL=boxReducer.d.ts.map