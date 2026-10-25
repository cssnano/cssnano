import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * An identifier token with the value given. Its text is escaped as needed.
 *
 * @param {string} value a non-empty identifier value
 * @return {CSSToken}
 */
declare function ident(value: string): CSSToken;
/**
 * An identifier token with the text and value given. Use it when the text
 * is already spelled, such as an escaped name, and must be kept as it is.
 *
 * @param {string} text a spelling the tokenizer reads as one identifier
 * @param {string} value the value that spelling decodes to
 * @return {CSSToken}
 */
declare function identifierWithText(text: string, value: string): CSSToken;
/**
 * A `<number>` token, a `<percentage>` token for unit `%`, or a
 * `<dimension>` token otherwise. The representation is kept as written.
 *
 * @param {string} representation a CSS `<number>`, such as `+1.50e1`
 * @param {string} [unit] an empty string for a plain number
 * @return {CSSToken}
 */
declare function numeric(representation: string, unit?: string): CSSToken;
/**
 * A `<integer>` number token. Only safe integers are accepted, so the value
 * is exact.
 *
 * @param {number} value
 * @return {CSSToken}
 */
declare function integer(value: number): CSSToken;
/**
 * A percentage token: a `<number>` followed by a percent sign.
 *
 * @param {number} value
 * @return {CSSToken}
 */
declare function percentage(value: number): CSSToken;
/**
 * A string token with the text given, a quoted CSS string, and the value it
 * decodes to. The text is the caller's, so it is not checked for escapes.
 *
 * @param {string} text
 * @param {string} value
 * @return {CSSToken}
 */
declare function stringToken(text: string, value: string): CSSToken;
/**
 * An unquoted url token, `name(value)`, with the name as written.
 * @param {string} value the decoded URL, possibly empty
 * @param {string} [name] `url` in any case
 * @return {CSSToken}
 */
declare function url(value: string, name?: string): CSSToken;
/**
 * A hash token, `#name`. Its type is id when the name would start an
 * identifier, and unrestricted otherwise, as the tokenizer reads it.
 *
 * @param {string} value a non-empty name of letters, digits, hyphens,
 *   underscores and non-ASCII characters
 * @return {CSSToken}
 */
declare function hash(value: string): CSSToken;
/**
 * A function token, `name(`. The name is written as an identifier is, so it
 * reads back with the same value.
 *
 * @param {string} name a non-empty function name
 * @return {CSSToken}
 */
declare function func(name: string): CSSToken;
export { func, hash, ident, identifierWithText, integer, numeric, percentage, stringToken, url, };
//# sourceMappingURL=tokenConstructors.d.ts.map