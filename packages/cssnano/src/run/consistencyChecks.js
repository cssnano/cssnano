/**
 * When on, a cached answer is compared with a fresh walk of the tree, so an
 * edit that skipped its bookkeeping throws at the next read. For tests only.
 */
let enabled = false;

/**
 * @param {boolean} [on]
 * @return {void}
 */
export function enableConsistencyChecks(on = true) {
  enabled = on;
}

/** @return {boolean} whether cached answers are checked against the tree */
export function consistencyChecksEnabled() {
  return enabled;
}
