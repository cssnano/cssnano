import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { componentTokens, family } from './pairFamilyBuilders.js';

/** @import {PairFamily, Parser} from './pairForms.js'; */
/** @import {CSSToken} from '@csstools/css-tokenizer'; */

const { asciiLowerCase, TokenType, tokens } = cssnanoUtils;

/** Identifiers that are not `<custom-ident>`s in a `<grid-line>`. */
const reservedIdents = new Set(['auto', 'span', 'default']);

/**
 * @param {CSSToken} token
 * @param {string} keyword - lowercase
 * @return {boolean}
 */
function isKeyword(token, keyword) {
  return token[0] === TokenType.Ident && asciiLowerCase(token[1]) === keyword;
}

/**
 * A `<custom-ident>` in a `<grid-line>`: an identifier that is not reserved
 * and not a CSS-wide keyword. Its comparison is case-sensitive.
 *
 * @param {CSSToken} token
 * @return {boolean}
 */
function isCustomIdent(token) {
  return (
    token[0] === TokenType.Ident &&
    !reservedIdents.has(asciiLowerCase(token[1])) &&
    !isCssWideKeyword(token[1])
  );
}

/**
 * The value of an `<integer>` token, or undefined for any other token.
 *
 * @param {CSSToken} token
 * @return {number | undefined}
 */
function integerOf(token) {
  const data = /** @type {{ type?: string, value?: number } | undefined} */ (
    token[4]
  );
  return token[0] === TokenType.Number && data?.type === 'integer'
    ? data.value
    : undefined;
}

/**
 * Whether a `<grid-line>` is `auto`, a custom identifier, an integer or
 * `span` with a count or an identifier. A line number is nonzero, and a span
 * count is positive. An integer and an identifier may come in either order.
 *
 * @param {CSSToken[]} list - the tokens of one `<grid-line>`
 * @return {boolean}
 */
function isGridLine(list) {
  if (list.length === 1 && isKeyword(list[0], 'auto')) return true;
  const span = list.length > 0 && isKeyword(list[0], 'span');
  const body = span ? list.slice(1) : list;
  if (body.length < 1 || body.length > 2) return false;
  let number;
  let ident = false;
  for (const token of body) {
    const integer = integerOf(token);
    if (integer !== undefined && number === undefined) {
      number = integer;
    } else if (isCustomIdent(token) && !ident) {
      ident = true;
    } else {
      return false;
    }
  }
  if (number === undefined) return true;
  return span ? number > 0 : number !== 0;
}

/**
 * A `<grid-line>` longhand, kept as written. A value the grammar does not
 * clearly accept, such as a function, is left alone.
 *
 * @type {Parser}
 */
function gridLine(decl) {
  const trimmed = decl.value.trim();
  if (isCssWideKeyword(trimmed)) return trimmed;
  const list = componentTokens(decl);
  if (list === undefined) return null;
  return isGridLine(list) ? list.map((token) => token[1]).join(' ') : null;
}

/**
 * Whether a normalized `<grid-line>` is a single custom identifier, which is
 * the only start that the omitted end repeats.
 *
 * @param {string} text
 * @return {boolean}
 */
function isCustomIdentText(text) {
  const list = tokens(text);
  return list.length === 1 && isCustomIdent(list[0]);
}

/**
 * The end an omitted second line takes: the start when it is a custom
 * identifier, else `auto`.
 *
 * @param {string} start
 * @return {string}
 */
function implicitEnd(start) {
  return isCustomIdentText(start) ? start : 'auto';
}

/**
 * `start / end`, with the end dropped when the grammar gives it back.
 *
 * @param {string[]} values
 * @return {string}
 */
function emitGridLines([start, end]) {
  return end === implicitEnd(start) ? start : `${start} / ${end}`;
}

/**
 * `row-start / column-start / row-end / column-end`. Each omitted trailing
 * slot takes the value the grammar gives it: the column start and the row end
 * copy the row start, and the column end copies the column start.
 *
 * @param {string[]} values
 * @return {string}
 */
function emitGridArea([rowStart, columnStart, rowEnd, columnEnd]) {
  const rowImplicit = implicitEnd(rowStart);
  let count = 4;
  if (columnEnd === implicitEnd(columnStart)) count = 3;
  if (count === 3 && rowEnd === rowImplicit) count = 2;
  if (count === 2 && columnStart === rowImplicit) count = 1;
  return [rowStart, columnStart, rowEnd, columnEnd].slice(0, count).join(' / ');
}

/** @type {PairFamily[]} */
export const gridPlacementFamilies = [
  // grid-area is first so that it takes the four longhands before a row or
  // column pair does, since the reducer runs families in insertion order.
  family(
    'grid-area',
    ['grid-row-start', 'grid-column-start', 'grid-row-end', 'grid-column-end'],
    {
      aliases: ['grid-row', 'grid-column'],
      parseValue: [gridLine, gridLine, gridLine, gridLine],
      emit: emitGridArea,
    }
  ),
  family('grid-row', ['grid-row-start', 'grid-row-end'], {
    aliases: ['grid-area'],
    parseValue: [gridLine, gridLine],
    emit: emitGridLines,
  }),
  family('grid-column', ['grid-column-start', 'grid-column-end'], {
    aliases: ['grid-area'],
    parseValue: [gridLine, gridLine],
    emit: emitGridLines,
  }),
];
