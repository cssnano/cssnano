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
/** @param {import('./tokenize.js').Term} node */
declare function isMath(node: import('./tokenize.js').Term): boolean;
/** @param {import('./tokenize.js').Term} node */
export default function isTime(node: import('./tokenize.js').Term): boolean;
export { isMath };
//# sourceMappingURL=isTime.d.ts.map