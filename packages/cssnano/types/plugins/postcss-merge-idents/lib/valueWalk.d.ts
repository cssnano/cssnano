import { TokenType } from '@csstools/css-tokenizer';
export type NestingFrame = {
    expectedArgs?: number[];
    argIndex: number;
    close: TokenType;
};
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
/**
 * @typedef {{ expectedArgs?: number[], argIndex: number, close: TokenType }} NestingFrame
 * @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken
 */
/**
 * Walks a declaration value, tracking function, bracket, and block nesting,
 * and hands each remaining token to the visitor together with the innermost
 * frame. Top-level tokens receive no frame; commas advance the current
 * function's argument position, and `expectedArgs` lists the argument
 * positions of a counter function that name a counter style.
 *
 * @template T
 * @param {CSSToken[]} tokenList
 * @param {(token: CSSToken, frame: NestingFrame | undefined, index: number) => T | undefined} visit
 * @return {T[]} the defined results of the visitor, in source order
 */
declare function walkValue<T>(tokenList: CSSToken[], visit: (token: CSSToken, frame: NestingFrame | undefined, index: number) => T | undefined): T[];
export { walkValue };
//# sourceMappingURL=valueWalk.d.ts.map