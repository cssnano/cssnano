export function checkRecord(record) {
  if (record.kind !== 1) throw new Error('bad kind');
  const local = { index: 0 };
  local.index = record.index;
  return local;
}
