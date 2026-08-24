
/**
 * @param {import('postcss-selector-parser').Selector} selector
 * @param {number} index
 * @param {string} value
 * @return {boolean | undefined | ''}
 */
function exists(selector, index, value) {
  const node = selector.at(index);
  return node && node.value && node.value.toLowerCase() === value;
}

export default exists;
