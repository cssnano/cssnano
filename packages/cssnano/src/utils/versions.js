/**
 * Whether a string is a dotted numeric release such as "26" or "26.6". Words
 * such as "TP" and ranges such as "18.5-18.7" are not.
 * @param {string} version
 * @return {boolean}
 */
export function isDottedVersion(version) {
  return /^\d+(?:\.\d+)*$/v.test(version);
}

/**
 * Orders dotted release numbers such as browser versions, numerically per
 * component, so that 10.1 follows 9.3. Callers pass dotted versions only.
 * @param {string} left
 * @param {string} right
 * @return {number} negative, zero or positive as left is older, equal or newer
 */
export function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index++) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
