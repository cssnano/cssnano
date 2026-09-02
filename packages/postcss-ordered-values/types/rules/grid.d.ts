/**
 * @param {import('../lib/tokenize.js').Term[]} gridAutoFlow
 * @return {string | null}
 */
declare const normalizeGridAutoFlow: (gridAutoFlow: import('../lib/tokenize.js').Term[]) => string | null;
/**
 * @param {import('../lib/tokenize.js').Term[]} gridGap
 * @return {string | null}
 */
declare const normalizeGridColumnRowGap: (gridGap: import('../lib/tokenize.js').Term[]) => string | null;
/**
 * @param {import('../lib/tokenize.js').Term[]} grid
 * @return {string | string[]}
 */
declare const normalizeGridColumnRow: (grid: import('../lib/tokenize.js').Term[]) => string | string[];
export { normalizeGridAutoFlow, normalizeGridColumnRowGap, normalizeGridColumnRow, };
//# sourceMappingURL=grid.d.ts.map