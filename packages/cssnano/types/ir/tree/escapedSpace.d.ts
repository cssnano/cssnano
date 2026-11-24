/**
 * The space or tab that a final backslash of a head escapes. PostCSS leaves it
 * in the separator, but the grammar makes it part of the identifier, so the
 * records hold it in the head. A newline is never taken: it makes the backslash
 * an invalid escape, which the selector list handles.
 *
 * @param {string} head the selector or prelude as written
 * @param {string | undefined} between the separator the node holds
 * @return {string} the character, or '' when the head escapes none
 */
export declare function escapedSpaceOf(head: string, between: string | undefined): string;
/**
 * The last character of a head text, when a backslash escapes it and it is a
 * space or tab. The write-back gives it back to the separator.
 *
 * @param {string} text
 * @return {string} the character, or '' when the text does not end in one
 */
export declare function trailingEscapedSpace(text: string): string;
//# sourceMappingURL=escapedSpace.d.ts.map