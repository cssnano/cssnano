export function checkRecord(record, arena) {
  record.index = 0;
  arena.detach(record.index);
  return record.kind;
}
