import { TokenType } from '@csstools/css-tokenizer';
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @param {string} value @return {CSSToken[]} */
declare function tokens(value: string): CSSToken[];
/** @param {string} value @param {(token: CSSToken) => string|undefined} callback @return {string} */
declare function rewrite(value: string, callback: (token: CSSToken) => string | undefined): string;
export { TokenType, rewrite, tokens };
//# sourceMappingURL=value.d.ts.map