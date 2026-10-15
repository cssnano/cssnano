export type Frame = {
    name: string | null;
    values: string[];
    operators: string[];
    args: string[];
    expectOperand: boolean;
};
export type ParserState = {
    input: import('@csstools/css-tokenizer').CSSToken[];
    frames: Frame[];
    stack: import('@csstools/css-tokenizer').TokenType[];
};
/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @return {string | null} */
export declare function parseMath(input: import('@csstools/css-tokenizer').CSSToken[]): string | null;
export type Dimension = 'time' | 'angle' | 'length' | 'number' | `dimension:${string}` | null;
export type TimeClassification = {
    isMath: boolean;
    dimension: Dimension;
    isNonNegative: boolean;
};
/** @param {import('./tokenize.js').Term} node @return {TimeClassification} */
export default function classifyTime(node: import('./tokenize.js').Term): TimeClassification;
//# sourceMappingURL=isTime.d.ts.map