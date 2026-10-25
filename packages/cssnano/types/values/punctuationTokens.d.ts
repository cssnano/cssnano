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
export { closeSquare, colon, openSquare };
//# sourceMappingURL=punctuationTokens.d.ts.map