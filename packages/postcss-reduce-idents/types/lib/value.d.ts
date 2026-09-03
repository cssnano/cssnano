declare const TokenType: typeof import("@csstools/css-tokenizer").TokenType;
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @type {(value: string) => CSSToken[]} */
declare const sharedTokens: (value: string) => CSSToken[];
/**
 * @param {string} value
 * @param {(token: CSSToken, isFunctionArgument: boolean) => string|undefined} callback
 * @param {Map<string, number[]>} [functions]
 * @param {CSSToken[]} [parsedTokens]
 * @return {string}
 */
declare function rewrite(value: string, callback: (token: CSSToken, isFunctionArgument: boolean) => string | undefined, functions?: Map<string, number[]>, parsedTokens?: CSSToken[]): string;
export { TokenType, rewrite, sharedTokens as tokens };
//# sourceMappingURL=value.d.ts.map