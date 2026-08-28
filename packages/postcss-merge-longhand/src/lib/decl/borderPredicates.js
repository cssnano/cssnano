/**
 * @param {string} value
 * @return {boolean}
 */
export function isCustomProperty(value) {
  return /var\s*\(\s*--/i.test(value);
}

/** @param {string[]} values @return {boolean} */
export function canMergeValues(values) {
  return !values.some(isCustomProperty);
}

/** @param {string[]} mapped @return {boolean} */
export function isCloseEnough(mapped) {
  return (
    (mapped[0] === mapped[1] && mapped[1] === mapped[2]) ||
    (mapped[1] === mapped[2] && mapped[2] === mapped[3]) ||
    (mapped[2] === mapped[3] && mapped[3] === mapped[0]) ||
    (mapped[3] === mapped[0] && mapped[0] === mapped[1])
  );
}

/** @param {string[]} mapped @return {string[]} */
export function getDistinctShorthands(mapped) {
  return [...new Set(mapped)];
}

/**
 * @param {[string, string, string]} values
 * @param {[string, string, string]} nextValues
 * @param {string[]} components
 * @return {string[]}
 */
export function diffingProps(values, nextValues, components) {
  const diff = [];
  for (const [i, component] of components.entries()) {
    if (values[i] !== nextValues[i]) {
      diff.push(component);
    }
  }
  return diff;
}
