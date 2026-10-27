import type { CSSToken } from '@csstools/css-tokenizer';
export type CellRanges = {
    tokens: (readonly CSSToken[] | undefined)[];
    starts: number[];
    ends: number[];
};
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * The token range of each cell's component, in parallel arrays. A cell whose
 * component has no function has no list; a cell no declaration filled has none.
 *
 * @typedef {{
 *   tokens: (readonly CSSToken[] | undefined)[],
 *   starts: number[],
 *   ends: number[],
 * }} CellRanges
 */
/**
 * Formats a side's width, style and color from its cells. The cells' ranges
 * say which tokens each component has, so the formatter classifies a cell
 * without tokenizing it. When a cell fails its slot's classifier, a slot has no
 * cell, or fewer than two slots are filled, it formats the joined text as
 * `minifyWsc` does, so the output is that of `minifyWsc` either way.
 *
 * @param {string[]} cells
 * @param {CellRanges} cellRanges
 * @param {number[]} indexes the cell of the width, style and color slot, or -1
 * for a blank slot
 * @return {string}
 */
export declare function minifyCells(cells: string[], cellRanges: CellRanges, indexes: number[]): string;
//# sourceMappingURL=borderCells.d.ts.map