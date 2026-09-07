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
export type Dimension = 'time' | 'angle' | 'number' | `dimension:${string}` | null;
export type TimeClassification = {
    isMath: boolean;
    dimension: Dimension;
    isNonNegative: boolean;
};
/** @param {import('./tokenize.js').Term} node @return {TimeClassification} */
export default function classifyTime(node: import('./tokenize.js').Term): TimeClassification;
//# sourceMappingURL=isTime.d.ts.map