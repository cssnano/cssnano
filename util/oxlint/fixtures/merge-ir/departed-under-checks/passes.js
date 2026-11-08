// Each read of a departed rule runs under a consistency check.
export function afterGuard(rule) {
  if (!consistencyChecksEnabled()) return;
  if (rule?.departed) throw new Error('departed');
}

export function inIf(record) {
  if (consistencyChecksEnabled()) {
    if (record.departed) throw new Error('departed');
  }
}

export function inChain(record) {
  if (consistencyChecksEnabled() && record.departed)
    throw new Error('departed');
}

export function mark(record) {
  record.departed = true;
}
