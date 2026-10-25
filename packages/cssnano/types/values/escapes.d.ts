/**
 * The CSS escapes that let a value be written inside an unquoted url token, a
 * string token or an identifier. Each escape reads back as the character it
 * replaces.
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
/** @param {string | undefined} character @return {boolean} */
declare function isDigitCharacter(character: string | undefined): boolean;
/** @param {string} character @return {boolean} */
declare function isLetterCharacter(character: string): boolean;
/** @param {number} codePoint @return {string} */
declare function hexEscape(codePoint: number): string;
/**
 * Writes an identifier so the tokenizer reads it back as one identifier with
 * the same value. Follows CSSOM's "serialize an identifier".
 *
 * @param {string} value
 * @return {string}
 */
declare function serializeIdentifier(value: string): string;
export { escapeForUrlToken, hexEscape, isDigitCharacter, isLetterCharacter, replaceEscapeChar, serializeIdentifier, };
//# sourceMappingURL=escapes.d.ts.map