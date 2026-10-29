import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/** Tokens built here have no position in a source text. */
const noPosition = -1;

/**
 * A token whose text is fixed by its type, with no position in a source text.
 *
 * @param {TokenType} type
 * @param {string} text the text the tokenizer reads back as this token
 * @param {{value: string} | undefined} [data]
 * @return {CSSToken}
 */
function fixedToken(type, text, data) {
  return /** @type {CSSToken} */ ([type, text, noPosition, noPosition, data]);
}

/**
 * The `:` token that separates a property from its value or a pseudo-class
 * from its name.
 *
 * @return {CSSToken}
 */
function colon() {
  return fixedToken(TokenType.Colon, ':');
}

/**
 * The `[` token that opens an attribute selector.
 *
 * @return {CSSToken}
 */
function openSquare() {
  return fixedToken(TokenType.OpenSquare, '[');
}

/**
 * The `]` token that closes an attribute selector.
 *
 * @return {CSSToken}
 */
function closeSquare() {
  return fixedToken(TokenType.CloseSquare, ']');
}

/**
 * The `(` token that opens a group.
 *
 * @return {CSSToken}
 */
function openParen() {
  return fixedToken(TokenType.OpenParen, '(');
}

/**
 * The `)` token that closes a function or a group.
 *
 * @return {CSSToken}
 */
function closeParen() {
  return fixedToken(TokenType.CloseParen, ')');
}

/**
 * A comma token, the separator of a list.
 *
 * @return {CSSToken}
 */
function comma() {
  return fixedToken(TokenType.Comma, ',');
}

/**
 * A whitespace token of one space, the separator the serializer writes.
 *
 * @return {CSSToken}
 */
function whitespace() {
  return fixedToken(TokenType.Whitespace, ' ');
}

/**
 * A delim token, one character that is no other token, such as `/`.
 *
 * @param {string} character a single code point
 * @return {CSSToken}
 */
function delim(character) {
  if ([...character].length !== 1) {
    throw new RangeError(`${character} is not one character`);
  }
  return fixedToken(TokenType.Delim, character, { value: character });
}

export {
  closeParen,
  closeSquare,
  colon,
  comma,
  delim,
  openParen,
  openSquare,
  whitespace,
};
