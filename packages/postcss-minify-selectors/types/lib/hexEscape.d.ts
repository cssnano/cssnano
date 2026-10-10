/**
 * Digit count of the hex escape that ends just before `end`, or 0 when no
 * hex escape ends there.
 * @param {string} value
 * @param {number} end
 */
export declare function hexEscapeDigitCount(value: string, end: number): number;
/**
 * A hex escape (`\61 `) consumes one trailing whitespace (CSS Syntax 3
 * §4.3.7), so serializers keep idents without that terminator and let
 * `needsHexEscapeTerminator` restore it where the neighbor requires one. An
 * escaped whitespace (`\ `) is the escaped character itself and must stay.
 * Within an ident, a terminator is only kept before a hex digit or another
 * whitespace.
 * @param {string} value
 */
export declare function dropHexEscapeTerminator(value: string): string;
/**
 * The single rule for restoring hex escape terminators: every joiner calls it
 * between adjacent pieces. Whether `before` ends in a hex escape that `after`
 * would extend: a leading whitespace is absorbed as its terminator, and a
 * leading hex digit becomes part of the escape unless it already has six
 * digits.
 * @param {string} before
 * @param {string} after
 */
export declare function needsHexEscapeTerminator(before: string, after: string): boolean;
/**
 * `needsHexEscapeTerminator` for a caller that already knows the digit count
 * of the escape ending the preceding piece and the first code of the next.
 * @param {number} digits
 * @param {number} next
 */
export declare function needsTerminatorAfterDigits(digits: number, next: number): boolean;
/**
 * Concatenates serialized pieces, adding the hex escape terminators that
 * `dropHexEscapeTerminator` removed.
 * @param {readonly string[]} pieces
 */
export declare function joinPieces(pieces: readonly string[]): string;
//# sourceMappingURL=hexEscape.d.ts.map