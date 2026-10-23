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
 * A percentage token: a `<number>` followed by a percent sign.
 *
 * @param {number} value
 * @return {CSSToken}
 */
declare function percentage(value: number): CSSToken;
export { ident, integer, percentage };
//# sourceMappingURL=tokenConstructors.d.ts.map