import { sameValue } from './pairFamilyGrammar.js';

/** @import {PairRow, Setter} from './pairFamilyOracle.js' */

/**
 * A closed alphabet of `<grid-line>` values. `a` and `b` are custom
 * identifiers, the others are `auto`, integers or `span` forms. Case matters
 * for identifiers, so a token is compared exactly.
 */
const gridLines = new Set([
  'auto',
  'a',
  'b',
  '1',
  '2',
  '-1',
  '1 a',
  'span 2',
  'span a',
]);

/**
 * @param {string} token
 * @return {string | undefined}
 */
function gridLine(token) {
  return gridLines.has(token) ? token : undefined;
}

/**
 * CSS Grid 1, section 8.3: a lone custom identifier also names the end, and
 * any other start leaves it `auto`.
 *
 * @param {string} line
 * @return {string}
 */
function implicitEnd(line) {
  return line === 'a' || line === 'b' ? line : 'auto';
}

/**
 * Slash-separated lines. Each omitted slot takes the value that `fill` gives
 * it from the lines before, so `fill` returns one value per name.
 *
 * @param {string[]} names
 * @param {(lines: string[]) => string[]} fill
 * @return {Setter}
 */
function slashed(names, fill) {
  return {
    names,
    parse: (value) => {
      const lines = value.split('/').map((part) => gridLine(part.trim()));
      if (lines.length > names.length || lines.includes(undefined)) {
        return undefined;
      }
      return fill(/** @type {string[]} */ (lines));
    },
  };
}

/**
 * @param {string[]} lines
 * @return {string[]}
 */
function fillRow(lines) {
  return lines.length === 1 ? [lines[0], implicitEnd(lines[0])] : lines;
}

/**
 * `grid-area` omits the trailing slots: the column start and the row end
 * copy the row start, and the column end copies the column start.
 *
 * @param {string[]} lines
 * @return {string[]}
 */
function fillArea(lines) {
  const [rowStart, givenColumnStart, givenRowEnd, givenColumnEnd] = lines;
  const columnStart = givenColumnStart ?? implicitEnd(rowStart);
  const rowEnd = givenRowEnd ?? implicitEnd(rowStart);
  const columnEnd = givenColumnEnd ?? implicitEnd(columnStart);
  return [rowStart, columnStart, rowEnd, columnEnd];
}

/**
 * CSS Grid 1, sections 8.3 and 8.4 and the grid-area shorthand. The row,
 * column and area shorthands and their four longhands share one row, since
 * each longhand is written by both a pair and the area.
 *
 * @return {PairRow}
 */
export function gridPlacementRow() {
  const longhandNames = [
    'grid-row-start',
    'grid-row-end',
    'grid-column-start',
    'grid-column-end',
  ];
  /** @type {Record<string, string>} */
  const longhands = {};
  /** @type {Record<string, Setter>} */
  const setters = {};
  for (const name of longhandNames) {
    longhands[name] = 'auto';
    setters[name] = sameValue([name], gridLine);
  }
  setters['grid-row'] = slashed(['grid-row-start', 'grid-row-end'], fillRow);
  setters['grid-column'] = slashed(
    ['grid-column-start', 'grid-column-end'],
    fillRow
  );
  setters['grid-area'] = slashed(
    ['grid-row-start', 'grid-column-start', 'grid-row-end', 'grid-column-end'],
    fillArea
  );
  return { family: 'grid-placement', longhands, setters };
}
