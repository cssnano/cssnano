import type { DeclarationItem } from '../blockDeclarations.js';
export declare const columns = "columns";
/** Slot of each longhand in the parsed `columns` value. */
export declare const columnSlots: Map<string, number>;
export declare const allColumnProps: Set<string>;
/**
 * @param {string} value
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} list the tokens of `value`
 * @return {{ value: string, hasTopLevelSlash: boolean, terms: { start: number, end: number, tokenCount: number, type: import('@csstools/css-tokenizer').TokenType, decoded: unknown }[] }}
 */
declare function tokenizeColumns(value: string, list: readonly import('@csstools/css-tokenizer').CSSToken[]): {
    value: string;
    hasTopLevelSlash: boolean;
    terms: {
        start: number;
        end: number;
        tokenCount: number;
        type: import('@csstools/css-tokenizer').TokenType;
        decoded: unknown;
    }[];
};
/**
 * @param {DeclarationItem} d
 * @return {ReturnType<typeof tokenizeColumns>}
 */
export declare function parsedValue(d: DeclarationItem): ReturnType<typeof tokenizeColumns>;
/**
 * Normalize a columns shorthand definition. Both longhand initial values
 * are 'auto', and omitted values reset to initial, so 'auto' can be dropped.
 *
 * Specification links: https://www.w3.org/TR/css-multicol-2/#columns
 * and https://www.w3.org/TR/css-sizing-4/#column-sizing
 *
 * @param {[string, string]} values
 * @return {string}
 */
export declare function normalize([w, c]: [string, string]): string;
/**
 * Takes the shorthand apart into column-width and column-count.
 * Combined with `||`, so components may appear in either order.
 *
 * @param {ReturnType<typeof tokenizeColumns>} parsed
 * @param {('width' | 'count' | 'initial' | undefined)[]} [roles]
 * @return {[string, string] | undefined}
 */
export declare function parseColumns(parsed: ReturnType<typeof tokenizeColumns>, roles?: ('width' | 'count' | 'initial' | undefined)[]): [string, string] | undefined;
/**
 * Check if a declaration sets column properties beyond column-width/count.
 * The `columns: <width> / <height>` form sets column-height via top-level slash.
 *
 * @param {DeclarationItem} declaration
 * @return {boolean}
 */
export declare const setsOtherColumnProperty: (declaration: DeclarationItem) => boolean;
/**
 * @param {DeclarationItem} d
 * @return {boolean}
 */
export declare function isValidColumns(d: DeclarationItem): boolean;
/**
 * @param {DeclarationItem} d
 * @return {boolean}
 */
export declare const isInvalid: (d: DeclarationItem) => boolean;
export {};
//# sourceMappingURL=columnsValue.d.ts.map