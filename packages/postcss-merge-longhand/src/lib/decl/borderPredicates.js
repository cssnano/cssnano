/** @param {string} value */
export const isCustomProperty = (value) => /var\s*\(\s*--/i.test(value);
/** @param {string[]} values */
export const canMergeValues = (values) => !values.some(isCustomProperty);
/** @param {string[]} m */
export const isCloseEnough = (m) =>
  (m[0] === m[1] && m[1] === m[2]) ||
  (m[1] === m[2] && m[2] === m[3]) ||
  (m[2] === m[3] && m[3] === m[0]) ||
  (m[3] === m[0] && m[0] === m[1]);
/** @param {string[]} mapped */
export const getDistinctShorthands = (mapped) => [...new Set(mapped)];

/**
 * @param {[string, string, string]} values
 * @param {[string, string, string]} nextValues
 * @param {string[]} components
 * @return {string[]}
 */
export function diffingProps(values, nextValues, components) {
  const diff = [];
  for (let i = 0; i < components.length; i++) {
    if (values[i] !== nextValues[i]) diff.push(components[i]);
  }
  return diff;
}
