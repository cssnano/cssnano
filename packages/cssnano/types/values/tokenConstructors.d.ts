import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * An identifier token with the value given. Its text is escaped as needed.
 *
 * @param {string} value a non-empty identifier value
 * @return {CSSToken}
 */
declare function ident(value: string): CSSToken;
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
export { ident, integer, numeric, percentage };
//# sourceMappingURL=tokenConstructors.d.ts.map