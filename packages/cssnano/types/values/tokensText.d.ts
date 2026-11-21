import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * The text a token list spells: each token's text, in order.
 *
 * @param {readonly CSSToken[]} list
 * @return {string}
 */
declare function tokensText(list: readonly CSSToken[]): string;
/**
 * The text a token list spells without its comments, as PostCSS's cleaned
 * value and params leave them out. Whitespace stays, so callers trim it.
 *
 * @param {readonly CSSToken[]} list
 * @return {string}
 */
declare function commentFreeText(list: readonly CSSToken[]): string;
/**
 * Whether a token list spells nothing but whitespace and comments. PostCSS's
 * text of a value, selector or prelude leaves those out.
 *
 * @param {readonly CSSToken[]} list
 * @return {boolean}
 */
declare function isBlankTokens(list: readonly CSSToken[]): boolean;
export { tokensText, commentFreeText, isBlankTokens };
//# sourceMappingURL=tokensText.d.ts.map