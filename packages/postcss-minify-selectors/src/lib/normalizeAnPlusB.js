import cssnanoUtils from 'cssnano-utils';
import { parseAnPlusB } from './argumentParsers.js';
import { dropHexEscapeTerminator, joinPieces } from './hexEscape.js';
import {
  consumeTrivia,
  decodedIdent,
  isImportantCommentToken,
} from './tokenUtils.js';

const { TokenType } = cssnanoUtils;

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
function hasImportantComment(input, start, end) {
  for (let index = start; index < end; index++)
    if (isImportantCommentToken(input[index])) return true;
  return false;
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {boolean} important @param {boolean} foundSyntax */
function normalizedFormulaToken(input, index, important, foundSyntax) {
  const token = input[index];
  let value = dropHexEscapeTerminator(token[1]);
  if (important) return value;
  if (
    !foundSyntax &&
    ((token[0] === TokenType.Delim && value === '+') ||
      (token[0] === TokenType.Dimension && value.startsWith('+')) ||
      (token[0] === TokenType.Number && value.startsWith('+')))
  )
    value = value.slice(1);
  if (
    (token[0] === TokenType.Ident || token[0] === TokenType.Dimension) &&
    !value.includes('\\')
  )
    value = value.replaceAll('N', 'n');
  return value;
}

/**
 * Normalizes an An+B formula tokens slice into canonical serialized form.
 *
 * @param {readonly import('./tokenUtils.js').CSSToken[]} input
 * @param {number} start
 * @param {number} end
 */
export function normalizeAnPlusB(input, start, end) {
  const formula = parseAnPlusB(input, start, end);
  if (!formula) return;
  const important = hasImportantComment(input, start, end);
  /** @type {string[]} */ const pieces = [];
  let foundSyntax = false;
  let significantCount = 0;
  let singleIdent = '';
  for (let index = start; index < end; index++) {
    const token = input[index];
    if (consumeTrivia(token, pieces)) continue;
    significantCount++;
    if (token[0] === TokenType.Ident) singleIdent = decodedIdent(token);
    pieces.push(normalizedFormulaToken(input, index, important, foundSyntax));
    foundSyntax = true;
  }
  let text = joinPieces(pieces);
  if (!important && significantCount === 1) {
    if (singleIdent === 'even') text = '2n';
    else if (singleIdent === 'odd') text = 'odd';
  }
  return { formula, important, text };
}
