export declare const dataUrlRegex: RegExp;
/**
 * @param {string} url
 * @return {string}
 */
export declare function convert(url: string): string;
/**
 * Escape characters for a CSS string token in the given quote context.
 * @param {string} value
 * @param {string} quote
 * @return {string}
 */
export declare function escapeForString(value: string, quote: string): string;
/**
 * Normalize and format a url() or src() token value (unquoted or quoted).
 * Returns undefined when the URL is a data URL.
 * @param {string} decoded
 * @param {string} quote
 * @param {string} name
 * @return {string | undefined}
 */
export declare function normalizeUrlTokenValue(decoded: string, quote: string, name: string): string | undefined;
//# sourceMappingURL=urls.d.ts.map