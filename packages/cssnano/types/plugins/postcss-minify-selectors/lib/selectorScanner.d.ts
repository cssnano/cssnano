/**
 * Normalizes a selector list that its tokens spell, with the tokens of the
 * result. The tokens are undefined when an emit carries none, so the caller
 * tokenizes the text only when it changed.
 *
 * @param {string} source the text the tokens spell
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} sourceTokens
 * @param {boolean} sort
 * @param {boolean} convertToIs
 * @param {boolean} keyframe
 * @param {boolean} hasDefaultNamespace
 * @returns {{text: string, tokens: readonly import('@csstools/css-tokenizer').CSSToken[] | undefined}}
 */
export declare function normalizeListTokens(source: string, sourceTokens: readonly import('@csstools/css-tokenizer').CSSToken[], sort: boolean, convertToIs: boolean, keyframe: boolean, hasDefaultNamespace: boolean): {
    text: string;
    tokens: readonly import('@csstools/css-tokenizer').CSSToken[] | undefined;
};
/**
 * @param {string} source
 * @param {boolean} [sort]
 * @param {boolean} [convertToIs]
 * @param {boolean} [keyframe]
 * @param {boolean} [hasDefaultNamespace]
 */
declare function normalizeList(source: string, sort?: boolean, convertToIs?: boolean, keyframe?: boolean, hasDefaultNamespace?: boolean): string;
/** @param {string} source */
declare function specificityOf(source: string): string;
export { normalizeList, specificityOf };
//# sourceMappingURL=selectorScanner.d.ts.map