/**
 * @param {import('postcss-value-parser').ParsedValue} gridAutoFlow
 * @return {import('postcss-value-parser').ParsedValue | string}
 */
declare const normalizeGridAutoFlow: (gridAutoFlow: import('postcss-value-parser').ParsedValue) => import('postcss-value-parser').ParsedValue | string;
/**
 * @param {import('postcss-value-parser').ParsedValue} gridGap
 * @return {import('postcss-value-parser').ParsedValue | string}
 */
declare const normalizeGridColumnRowGap: (gridGap: import('postcss-value-parser').ParsedValue) => import('postcss-value-parser').ParsedValue | string;
/**
 * @param {import('postcss-value-parser').ParsedValue} grid
 * @return {string | string[]}
 */
declare const normalizeGridColumnRow: (grid: import('postcss-value-parser').ParsedValue) => string | string[];
export { normalizeGridAutoFlow };
export { normalizeGridColumnRowGap };
export { normalizeGridColumnRow };
declare const _default: {
    normalizeGridAutoFlow: typeof normalizeGridAutoFlow;
    normalizeGridColumnRowGap: typeof normalizeGridColumnRowGap;
    normalizeGridColumnRow: typeof normalizeGridColumnRow;
};
export default _default;
//# sourceMappingURL=grid.d.ts.map