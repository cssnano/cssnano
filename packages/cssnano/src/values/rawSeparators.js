import cssnanoUtils from '#utils';
import { TokenType } from '@csstools/css-tokenizer';

const { tokens: tokenizeValue } = cssnanoUtils;

/** Whitespace characters that CSS treats as whitespace in raws. */
export const whitespaceRegex = /[ \t\n\r\f]/gv;
const plainSeparatorRegex = /^[ \t\n\r\f]*:[ \t\n\r\f]*$/v;

/**
 * Drop whole whitespace tokens; character-level replacement would reach
 * preserved comments.
 * @param {string} between
 * @return {string}
 */
export function trimSeparator(between) {
  if (plainSeparatorRegex.test(between)) return ':';
  return tokenizeValue(between)
    .filter(([type]) => type !== TokenType.Whitespace)
    .map(([, raw]) => raw)
    .join('');
}

/**
 * Trim only the parser-consumed whitespace run around the colon (CSS
 * Variables 1).
 * @param {string} between
 * @return {string}
 */
export function trimCustomPropertySeparator(between) {
  if (plainSeparatorRegex.test(between)) return ':';
  const tokens = tokenizeValue(between).filter(
    ([type]) => type !== TokenType.EOF
  );
  let start = 0;
  while (tokens[start]?.[0] === TokenType.Whitespace) start++;
  if (tokens[start]?.[0] === TokenType.Colon) {
    // The colon stays; only its surrounding parser-consumed whitespace runs
    // may go.
    start++;
    while (tokens[start]?.[0] === TokenType.Whitespace) start++;
    return (
      ':' +
      tokens
        .slice(start)
        .map(([, raw]) => raw)
        .join('')
    );
  }
  // A kept comment before the colon interrupts the parser-consumed run;
  // leave the authored separator untouched.
  return between;
}

/**
 * Collapses multi-character whitespace runs in at-rule afterName to a single
 * space while preserving comments.
 * @param {string} afterName
 * @return {string}
 */
export function normalizeAfterName(afterName) {
  if (!afterName || afterName === ' ') return afterName;
  if (!afterName.includes('/*')) return ' ';
  let result = '';
  for (const [type, raw] of tokenizeValue(afterName)) {
    result += type === TokenType.Whitespace ? ' ' : raw;
  }
  return result;
}
