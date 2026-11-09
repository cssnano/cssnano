// A function outside the readers takes the receiving declarations directly.
export function receiving(records, index) {
  return records.declarations.receivingOf(records, index);
}
