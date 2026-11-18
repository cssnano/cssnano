/** Whitespace characters that CSS treats as whitespace in raws. */
export declare const whitespaceRegex: RegExp;
/**
 * Drop whole whitespace tokens; character-level replacement would reach
 * preserved comments.
 * @param {string} between
 * @return {string}
 */
export declare function trimSeparator(between: string): string;
/**
 * Trim only the parser-consumed whitespace run around the colon (CSS
 * Variables 1).
 * @param {string} between
 * @return {string}
 */
export declare function trimCustomPropertySeparator(between: string): string;
/**
 * Collapses multi-character whitespace runs in at-rule afterName to a single
 * space while preserving comments.
 * @param {string} afterName
 * @return {string}
 */
export declare function normalizeAfterName(afterName: string): string;
//# sourceMappingURL=rawSeparators.d.ts.map