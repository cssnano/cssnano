import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * The `:` token that separates a property from its value or a pseudo-class
 * from its name.
 *
 * @return {CSSToken}
 */
declare function colon(): CSSToken;
/**
 * The `[` token that opens an attribute selector.
 *
 * @return {CSSToken}
 */
declare function openSquare(): CSSToken;
/**
 * The `]` token that closes an attribute selector.
 *
 * @return {CSSToken}
 */
declare function closeSquare(): CSSToken;
/**
 * The `(` token that opens a group.
 *
 * @return {CSSToken}
 */
declare function openParen(): CSSToken;
/**
 * The `)` token that closes a function or a group.
 *
 * @return {CSSToken}
 */
declare function closeParen(): CSSToken;
/**
 * A comma token, the separator of a list.
 *
 * @return {CSSToken}
 */
declare function comma(): CSSToken;
/**
 * A whitespace token of one space, the separator the serializer writes.
 *
 * @return {CSSToken}
 */
declare function whitespace(): CSSToken;
/**
 * A delim token, one character that is no other token, such as `/`.
 *
 * @param {string} character a single code point
 * @return {CSSToken}
 */
declare function delim(character: string): CSSToken;
export { closeParen, closeSquare, colon, comma, delim, openParen, openSquare, whitespace, };
//# sourceMappingURL=punctuationTokens.d.ts.map