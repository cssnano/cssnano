import cssnanoUtils from '#utils';
import { TokenType } from '@csstools/css-tokenizer';

const { tokens: tokenizeValue } = cssnanoUtils;

const ieHackRegex = /[ \t\n\r\f]*(\\9)(\r\n|[ \t\n\r\f])?([ \t\n\r\f]*)/gv;
const hexDigitRegex = /^[0-9a-fA-F]$/v;
// Whitespace before the end of the text or a delimiter separates nothing.
const separatedBy = new Set(['', '!', ',', ')', ';']);
const quoteRegex = /["']/v;

/**
 * Keeps the space that `\9` folds in when a hex digit follows, since dropping
 * it would join the digit to the escape. Whitespace after that space
 * separates two components, so it stays unless a delimiter or the end
 * follows.
 *
 * @param {string} match
 * @param {string} hack
 * @param {string | undefined} folded
 * @param {string} separator
 * @param {number} offset
 * @param {string} whole
 * @return {string}
 */
function unhackMatch(match, hack, folded, separator, offset, whole) {
  const next = whole[offset + match.length] ?? '';
  if (separator && !separatedBy.has(next)) return `${hack}  `;
  return hack + (folded && hexDigitRegex.test(next) ? folded : '');
}

/**
 * Removes the whitespace around each IE hack outside strings. A string keeps
 * its text, so the whitespace inside it is part of the value.
 *
 * @param {string} text
 * @return {string}
 */
export function unhackOutsideStrings(text) {
  if (!text.includes('\\9')) return text;
  // Without a quote there is no string to keep, so the text is not tokenized.
  if (!quoteRegex.test(text)) return text.replaceAll(ieHackRegex, unhackMatch);
  let unhacked = '';
  let cursor = 0;
  for (const token of tokenizeValue(text)) {
    if (token[0] !== TokenType.String) continue;
    unhacked +=
      text.slice(cursor, token[2]).replaceAll(ieHackRegex, unhackMatch) +
      token[1];
    cursor = token[3] + 1;
  }
  return unhacked + text.slice(cursor).replaceAll(ieHackRegex, unhackMatch);
}
