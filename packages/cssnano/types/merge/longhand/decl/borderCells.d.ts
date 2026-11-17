import type { ValueComponent } from '../componentRanges.js';
/**
 * Formats a side's width, style and color from its cells. The cells' components
 * say which tokens each cell has, so the formatter classifies a cell
 * without tokenizing it. When a cell fails its slot's classifier, a slot has no
 * cell, or fewer than two slots are filled, it formats the joined text as
 * `minifyWsc` does, so the output is that of `minifyWsc` either way.
 *
 * @param {string[]} cells
 * @param {(ValueComponent | undefined)[]} cellComponents the component each
 * cell spells; a cell no declaration filled has none
 * @param {number[]} indexes the cell of the width, style and color slot, or -1
 * for a blank slot
 * @return {string}
 */
export declare function minifyCells(cells: string[], cellComponents: (ValueComponent | undefined)[], indexes: number[]): string;
//# sourceMappingURL=borderCells.d.ts.map