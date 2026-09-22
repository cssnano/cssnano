export type BorderSlotName = 'width' | 'style' | 'color';
export type BorderSlot = {
    name: BorderSlotName;
    match: (term: import('../lib/tokenize.js').Term, lower: string) => boolean;
};
/**
 * @typedef {'width' | 'style' | 'color'} BorderSlotName
 * @typedef {{ name: BorderSlotName, match: (term: import('../lib/tokenize.js').Term, lower: string) => boolean }} BorderSlot
 */
/**
 * @param {import('../lib/tokenize.js').Term[]} border
 * @param {boolean} [allowAuto]
 * @return {string | null}
 */
declare function normalizeBorder(border: import('../lib/tokenize.js').Term[], allowAuto?: boolean): string | null;
export default normalizeBorder;
//# sourceMappingURL=border.d.ts.map