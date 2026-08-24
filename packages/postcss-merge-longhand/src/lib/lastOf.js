/**
 * @template T
 * @param {Set<T>} set
 * @return {T}
 */
function lastOf(set) {
  /** @type {T | undefined} */
  let last;
  for (const x of set) {
    last = x;
  }
  return /** @type {T} */ (last);
}

export default lastOf;
