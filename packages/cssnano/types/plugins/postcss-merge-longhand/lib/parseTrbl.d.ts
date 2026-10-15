/**
 * Spreads the one to four values of a top/right/bottom/left shorthand over the
 * four sides: a missing right repeats top, bottom repeats top, left repeats
 * right.
 *
 * @template T
 * @param {T[]} s
 * @return {[T, T, T, T]}
 */
export declare function expandFourSides<T>(s: T[]): [T, T, T, T];
/**
 * @param {unknown[]} sides - four expanded sides, or keys that compare equal
 * when the sides do
 * @return {number} how many leading sides a shorthand needs to say them all
 */
export declare function fourSideCount(sides: unknown[]): number;
export default _default;
/** @param {string | string[]} v */
declare function _default(v: string | string[]): [string, string, string, string];
//# sourceMappingURL=parseTrbl.d.ts.map