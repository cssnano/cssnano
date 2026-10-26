export type CSSToken = import('./tokenUtils.js').CSSToken;
export type Specificity = import('./arena.js').Specificity;
export type PieceResult = {
    pieces?: string[];
    tokens?: (CSSToken | undefined)[];
    valid: boolean;
};
/** @param {string} kind @return {string | undefined} */
export declare function firstPseudoReplacement(kind: string): string | undefined;
export { parseAnPlusB } from './anPlusB.js';
/**
 * Parsers of the pseudo-class and pseudo-element arguments that are
 * normalized as token pieces, keyed by the grammar name in `selectorGrammar`.
 * @type {ReadonlyMap<string, (tokens: readonly CSSToken[], start: number, end: number) => PieceResult & { specificity?: Specificity }>}
 */
export declare const pieceArgumentParsers: ReadonlyMap<string, (tokens: readonly CSSToken[], start: number, end: number) => PieceResult & {
    specificity?: Specificity;
}>;
//# sourceMappingURL=argumentParsers.d.ts.map