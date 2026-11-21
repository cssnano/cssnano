import type { CSSToken } from '@csstools/css-tokenizer';
export type MathType = 'number' | 'length' | 'percentage' | 'length-percentage';
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start the index of the first token of the expression
 * @param {number} end the index just past its last token
 * @return {MathType | undefined} the type of a math function or a
 * parenthesized expression; `undefined` when a user agent rejects the
 * expression or this module cannot tell
 */
export declare function mathType(tokens: readonly CSSToken[], start: number, end: number): MathType | undefined;
//# sourceMappingURL=mathType.d.ts.map