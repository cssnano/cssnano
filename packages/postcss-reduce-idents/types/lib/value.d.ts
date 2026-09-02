import { TokenType } from '@csstools/css-tokenizer';
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @param {string} value @return {CSSToken[]} */
declare function tokens(value: string): CSSToken[];
/**
 * @param {string} value
 * @param {(token: CSSToken, isFunctionArgument: boolean) => string|undefined} callback
 * @param {Map<string, number[]>} [functions]
 * @param {CSSToken[]} [parsedTokens]
 * @return {string}
 */
declare function rewrite(value: string, callback: (token: CSSToken, isFunctionArgument: boolean) => string | undefined, functions?: Map<string, number[]>, parsedTokens?: CSSToken[]): string;
export { TokenType, rewrite, tokens };
//# sourceMappingURL=value.d.ts.map