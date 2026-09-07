export type CSSToken = import('./tokenUtils.js').CSSToken;
/**
 * Parse the CSS Syntax An+B microsyntax from a complete token span.
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ isTwoNPlusOne: boolean } | undefined}
 */
export declare function parseAnPlusB(tokens: readonly CSSToken[], start: number, end: number): {
    isTwoNPlusOne: boolean;
} | undefined;
/** @param {CSSToken} token */
//# sourceMappingURL=anPlusB.d.ts.map