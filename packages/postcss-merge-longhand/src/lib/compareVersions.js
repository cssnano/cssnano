/**
 * Orders dotted release numbers such as browser versions, numerically per
 * component, so that 10.1 follows 9.3.
 *
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
export function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
}
