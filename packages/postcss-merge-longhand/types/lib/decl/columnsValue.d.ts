import type { Declaration } from 'postcss';
export declare const columns = "columns";
/** Slot of each longhand in the parsed `columns` value. */
export declare const columnSlots: Map<string, number>;
export declare const allColumnProps: Set<string>;
/**
 * @param {string} value
 * @return {{ value: string, hasTopLevelSlash: boolean, terms: { start: number, end: number, tokenCount: number, type: import('@csstools/css-tokenizer').TokenType, decoded: unknown }[] }}
 */
declare function tokenizeColumns(value: string): {
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
/** @param {Declaration} d @return {ReturnType<typeof tokenizeColumns>} */
export declare function parsedValue(d: Declaration): ReturnType<typeof tokenizeColumns>;
/**
 * Normalize a columns shorthand definition. Both longhand initial values
 * are 'auto', and omitted values reset to initial, so 'auto' can be dropped.
 *
 * Specification link: https://www.w3.org/TR/css3-multicol/
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
 * @param {Declaration} declaration
 * @return {boolean}
 */
export declare const setsOtherColumnProperty: (declaration: Declaration) => boolean;
/** @param {Declaration} d @return {boolean} */
export declare function isValidColumns(d: Declaration): boolean;
/** @param {Declaration} d @return {boolean} */
export declare const isInvalid: (d: Declaration) => boolean;
export {};
//# sourceMappingURL=columnsValue.d.ts.map