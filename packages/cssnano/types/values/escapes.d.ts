/**
 * The CSS escapes that let a value be written inside an unquoted url token or
 * a string token. Each escape reads back as the character it replaces.
 */
/**
 * Writes a character as a CSS escape, the way a string or url token reads back.
 *
 * @param {string} match
 * @return {string}
 */
declare function replaceEscapeChar(match: string): string;
/**
 * Escapes the characters that would end an unquoted url token.
 *
 * @param {string} value
 * @return {string}
 */
declare function escapeForUrlToken(value: string): string;
export { escapeForUrlToken, replaceEscapeChar };
//# sourceMappingURL=escapes.d.ts.map