import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * The token ranges that `list.space` splits a value into: whitespace outside
 * parentheses separates components, and a `)` never opens a negative depth.
 * Tokens split where the string does except on a comment or a bad token.
 *
 * @param {readonly CSSToken[]} tokens
 * @return {number[]} the start and end token index of each component,
 * flattened
 */
declare function componentRanges(tokens: readonly CSSToken[]): number[];
/**
 * @param {string} prop lower-cased
 * @param {string} value
 * @param {readonly CSSToken[]} [tokens] the tokens `value` spells. A value with
 * no `(` has no function to type, so it needs none; one with a `(` is
 * tokenized when the caller omits them.
 * @return {boolean} whether the browser keeps the declaration; a property
 * outside the box groups is never kept
 */
declare function boxBrowserKeeps(prop: string, value: string, tokens?: readonly CSSToken[]): boolean;
export { boxBrowserKeeps, componentRanges };
//# sourceMappingURL=validateBox.d.ts.map