import type { Declaration, Rule } from 'postcss';
/** @param {Rule} rule @param {string} prop @param {Declaration[]} [declarations] */
export declare function reduceBox(rule: Rule, prop: string, declarations?: Declaration[]): void;
/** @param {string} p */
export declare const box: (p: string) => {
    explode(): void;
    /** @param {Rule} r */
    merge: (r: Rule) => void;
};
//# sourceMappingURL=boxReducer.d.ts.map