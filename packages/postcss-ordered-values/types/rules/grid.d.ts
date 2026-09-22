/**
 * @param {import('../lib/tokenize.js').Term[]} gridAutoFlow
 * @return {string | null}
 */
declare const normalizeGridAutoFlow: (gridAutoFlow: import('../lib/tokenize.js').Term[]) => string | null;
/**
 * @param {import('../lib/tokenize.js').Term[]} grid
 * @param {number} [maxLines=2] Maximum number of <grid-line>s the property accepts.
 * @return {string | null}
 */
declare const normalizeGridColumnRow: (grid: import('../lib/tokenize.js').Term[], maxLines?: number) => string | null;
export { normalizeGridAutoFlow, normalizeGridColumnRow };
//# sourceMappingURL=grid.d.ts.map