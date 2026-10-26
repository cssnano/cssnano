/**
 * Looks up the memo of a context, creating it on first use.
 *
 * @template T
 * @param {(Map<string, T> | undefined)[]} memos
 * @param {number} context
 * @returns {Map<string, T>}
 */
export declare function memoOf<T>(memos: (Map<string, T> | undefined)[], context: number): Map<string, T>;
//# sourceMappingURL=memo.d.ts.map