import { unit } from './parse.js';

/**
 * @param {import('postcss-value-parser').Node} node
 * @return {import('postcss-value-parser').Dimension | false}
 */
function isNum(node) {
  return unit(node.value);
}

export default isNum;
