/**
 * Restores the whitespace that PostCSS trims from a declaration value ending in
 * a backslash, so the value tokenizes as the browser reads it. A space or tab
 * after the backslash makes an escape; a newline leaves the backslash a delim,
 * which no rename removes.
 *
 * @param {import('postcss').Declaration} decl
 * @return {string | undefined} the value to tokenize and rewrite, or
 *   `undefined` when the code point after a trailing backslash is unknown
 */
declare function trailingEscape(decl: import('postcss').Declaration): string | undefined;
export { trailingEscape };
//# sourceMappingURL=trailingEscape.d.ts.map