import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * An identifier token with the value given. Its text is escaped as needed.
 *
 * @param {string} value a non-empty identifier value
 * @return {CSSToken}
 */
declare function ident(value: string): CSSToken;
/**
 * A `<integer>` number token. Only safe integers are accepted, so the value
 * is exact.
 *
 * @param {number} value
 * @return {CSSToken}
 */
declare function integer(value: number): CSSToken;
/**
 * A `<number>` token. Any finite value is accepted; the token's type is
 * `integer` exactly when its text reads back as an integer.
 *
 * @param {number} value
 * @return {CSSToken}
 */
declare function number(value: number): CSSToken;
/**
 * A dimension token: a `<number>` followed by a unit.
 *
 * @param {number} value
 * @param {string} unit a non-empty identifier
 * @return {CSSToken}
 */
declare function dimension(value: number, unit: string): CSSToken;
/**
 * A whitespace token, written as a single space.
 *
 * @return {CSSToken}
 */
declare function whitespace(): CSSToken;
export { dimension, ident, integer, number, whitespace };
//# sourceMappingURL=tokenConstructors.d.ts.map