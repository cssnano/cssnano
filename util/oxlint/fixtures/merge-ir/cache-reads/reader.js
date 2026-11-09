// The two readers of a rule's declaration keys, the only functions that may
// call keysOf on the declaration cache.
export function declarationKeys(records, index) {
  return records.declarations.keysOf(records, index);
}

export function holdsOnlyDeclarationsOf(records, index) {
  return records.declarations.keysOf(records, index).keys.length > 0;
}
