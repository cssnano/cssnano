export = commentParser;
/**
 * CSS Comment Parser with context awareness
 * Properly handles comments inside strings, URLs, and escaped characters
 *
 * @param {string} input
 * @return {[number, number, number][]}
 */
declare function commentParser(input: string): [number, number, number][];
export type ParserContext = {
    input: string;
    tokens: [number, number, number][];
    length: number;
    pos: number;
    state: number;
    tokenStart: number;
    commentStart: number;
};
//# sourceMappingURL=commentParser.d.ts.map