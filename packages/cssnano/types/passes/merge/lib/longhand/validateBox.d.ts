import type { CSSToken } from '@csstools/css-tokenizer';
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
export { boxBrowserKeeps };
//# sourceMappingURL=validateBox.d.ts.map