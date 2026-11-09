// declarationKeys is a function; calling it as a method reads the cache by
// another name.
export function keysOf(records, index) {
  return records.declarationKeys(index);
}
