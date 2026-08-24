import postcssValueParser from 'postcss-value-parser';

const { unit } = postcssValueParser;
/**
 * @param {import('postcss-value-parser').Node} node
 * @return {import('postcss-value-parser').Dimension | false}
 */
function isNum(node) {
  return unit(node.value);
}

export default isNum;
