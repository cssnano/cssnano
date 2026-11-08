// No declarationKeys here, so the required reader is missing.
export function holdsOnlyDeclarationsOf(records, index) {
  return records.declarations.keysOf(records, index);
}
