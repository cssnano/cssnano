export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/**
 * The comment text without its delimiters. An unclosed comment has no
 * trailing delimiter, so only the leading one is stripped.
 *
 * @param {string} raw
 * @return {string}
 */
export declare function commentContents(raw: string): string;
/**
 * Whether joining two raw spellings would re-tokenize as a different token
 * sequence.
 *
 * @param {string} previousRaw
 * @param {string} nextRaw
 * @return {boolean}
 */
export declare function joinsIntoDifferentTokens(previousRaw: string, nextRaw: string): boolean;
//# sourceMappingURL=tokenUtils.d.ts.map