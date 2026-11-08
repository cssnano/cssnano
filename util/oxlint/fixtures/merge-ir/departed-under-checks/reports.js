// The else branch, a ternary and a guard that comes after a statement are not
// checks, so each read is reported.
export function inElse(record) {
  if (consistencyChecksEnabled()) {
    return 1;
  } else {
    return record.departed;
  }
}

export function inTernary(record) {
  return consistencyChecksEnabled() ? record.departed : false;
}

export function afterStatement(record) {
  const size = 1;
  if (!consistencyChecksEnabled()) return;
  return record.departed && size;
}
