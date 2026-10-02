import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import { COUNTER_STYLE_FUNCTIONS } from './grammar.js';

const { asciiLowerCase, decoded } = cssnanoUtils;

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
function walkValue(tokenList, visit) {
  /** @type {NestingFrame[]} */
  const stack = [];
  /** @type {T[]} */
  const results = [];

  for (const [index, token] of tokenList.entries()) {
    const type = token[0];
    const frame = stack.at(-1);
    if (type === TokenType.Function) {
      // Match on the decoded name: raw text spells escapes, e.g. a function
      // written `\63 ounter(` has the decoded name "counter".
      const funcName = asciiLowerCase(decoded(token));
      stack.push({
        expectedArgs: COUNTER_STYLE_FUNCTIONS.get(funcName),
        argIndex: 0,
        close: TokenType.CloseParen,
      });
    } else if (type === TokenType.OpenParen) {
      stack.push({ argIndex: 0, close: TokenType.CloseParen });
    } else if (type === TokenType.OpenSquare) {
      stack.push({ argIndex: 0, close: TokenType.CloseSquare });
    } else if (type === TokenType.OpenCurly) {
      stack.push({ argIndex: 0, close: TokenType.CloseCurly });
    } else if (type === frame?.close) {
      stack.pop();
    } else if (type === TokenType.Comma && frame) {
      frame.argIndex++;
    } else {
      const result = visit(token, frame, index);
      if (result !== undefined) {
        results.push(result);
      }
    }
  }

  return results;
}

export { walkValue };
