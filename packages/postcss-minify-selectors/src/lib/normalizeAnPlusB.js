import cssnanoUtils from 'cssnano-utils';
import { parseAnPlusB } from './argumentParsers.js';

const { TokenType } = cssnanoUtils;

/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
function decoded(token) {
  return (
    (/** @type {{value?:string}|undefined} */
    (token?.[4])?.value ?? token?.[1] ?? '').toLowerCase()
  );
}

/** @param {string | undefined} character */
function isHexDigit(character) {
  return character !== undefined && /^[\dA-Fa-f]$/v.test(character);
}

/** @param {string} value */
function endsInShortHexEscape(value) {
  let index = value.length;
  while (index > 0 && value[index - 1] === ' ') index--;
  let digits = 0;
  while (index > 0 && digits < 6 && isHexDigit(value[index - 1])) {
    index--;
    digits++;
  }
  return digits > 0 && digits < 6 && value[index - 1] === '\\';
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
function nextSerializedToken(input, start, end) {
  for (let index = start; index < end; index++) {
    const token = input[index];
    if (token[0] === TokenType.Whitespace) continue;
    if (token[0] !== TokenType.Comment || token[1].startsWith('/*!'))
      return token;
  }
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
function hasImportantComment(input, start, end) {
  for (let index = start; index < end; index++)
    if (
      input[index][0] === TokenType.Comment &&
      input[index][1].startsWith('/*!')
    )
      return true;
  return false;
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end @param {boolean} important @param {boolean} foundSyntax */
function normalizedFormulaToken(input, index, end, important, foundSyntax) {
  const token = input[index];
  let value = token[1];
  if (value.endsWith(' ')) {
    const next = nextSerializedToken(input, index + 1, end);
    value =
      endsInShortHexEscape(value) && isHexDigit(next?.[1][0])
        ? `${value.trimEnd()} `
        : value.trimEnd();
  }
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
    if (token[0] === TokenType.Whitespace) continue;
    if (token[0] === TokenType.Comment) {
      if (token[1].startsWith('/*!')) pieces.push(token[1]);
      continue;
    }
    significantCount++;
    if (token[0] === TokenType.Ident) singleIdent = decoded(token);
    pieces.push(
      normalizedFormulaToken(input, index, end, important, foundSyntax)
    );
    foundSyntax = true;
  }
  let text = pieces.join('');
  if (!important && significantCount === 1) {
    if (singleIdent === 'even') text = '2n';
    else if (singleIdent === 'odd') text = 'odd';
  }
  return { formula, important, text };
}
