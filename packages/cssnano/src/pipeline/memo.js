/**
 * Looks up the memo of a context, creating it on first use.
 *
 * @template T
 * @param {(Map<string, T> | undefined)[]} memos
 * @param {number} context
 * @returns {Map<string, T>}
 */
export function memoOf(memos, context) {
  let memo = memos[context];
  if (memo === undefined) {
    memo = new Map();
    memos[context] = memo;
  }
  return memo;
}
