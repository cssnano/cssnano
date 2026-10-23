export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/**
 * @param {string} source
 * @param {Map<string, CSSToken[]>} parserCache
 * @return {CSSToken[]}
 */
export declare function getTokens(source: string, parserCache: Map<string, CSSToken[]>): CSSToken[];
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
 * @param {Map<string, CSSToken[]>} parserCache
 * @return {boolean}
 */
export declare function joinsIntoDifferentTokens(previousRaw: string, nextRaw: string, parserCache: Map<string, CSSToken[]>): boolean;
//# sourceMappingURL=tokenUtils.d.ts.map