import minifyWidthStyleColor, { minifyComponents } from '../minifyWsc.js';
import { toLower } from '../parseWsc.js';
import { isBorderStyle, isBorderWidth, isColor } from '../validateWsc.js';

/** @import {ValueComponent} from '../componentRanges.js' */

const classifiers = [isBorderWidth, isBorderStyle, isColor];

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
export function minifyCells(cells, cellComponents, indexes) {
  /** @type {(string | undefined)[]} */
  const values = [];
  let named = 0;
  for (let slot = 0; slot < 3; slot++) {
    const index = indexes[slot];
    const text = index < 0 ? '' : cells[index];
    if (!text) {
      values.push(undefined);
      continue;
    }
    const component = cellComponents[index];
    if (
      !classifiers[slot](
        text,
        component?.list,
        component?.start ?? 0,
        component?.end ?? 0
      )
    ) {
      return minifyWidthStyleColor(joinCells(cells, indexes));
    }
    values.push(toLower(text));
    named++;
  }
  if (named < 2) return minifyWidthStyleColor(joinCells(cells, indexes));
  return minifyComponents(values[0], values[1], values[2]);
}

/**
 * @param {string[]} cells
 * @param {number[]} indexes
 * @return {string}
 */
function joinCells(cells, indexes) {
  return indexes.map((index) => (index < 0 ? '' : cells[index])).join(' ');
}
