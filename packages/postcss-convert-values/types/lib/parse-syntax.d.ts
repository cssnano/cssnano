declare const TokenType: typeof import("@csstools/css-tokenizer").TokenType;
/**
 * @param {typeof TokenType.OpenParen | typeof TokenType.OpenSquare | typeof TokenType.OpenCurly} type
 * @return {typeof TokenType.CloseParen | typeof TokenType.CloseSquare | typeof TokenType.CloseCurly}
 */
export declare function closeForOpening(type: typeof TokenType.OpenParen | typeof TokenType.OpenSquare | typeof TokenType.OpenCurly): typeof TokenType.CloseParen | typeof TokenType.CloseSquare | typeof TokenType.CloseCurly;
/** @param {string} value @return {boolean} */
export declare function syntaxAllowsPercentage(value: string): boolean;
export {};
//# sourceMappingURL=parse-syntax.d.ts.map