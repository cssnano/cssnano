import { stringify } from 'postcss-value-parser';

/**
 * @param {import('postcss-value-parser').Node[][]} values
 * @return {string}
 */
export default function getValue(values) {
  return stringify(flatten(values));
}
/**
 * @param {import('postcss-value-parser').Node[][]} values
 * @return {import('postcss-value-parser').Node[]}
 */
function flatten(values) {
  const nodes = [];
  for (const [index, arg] of values.entries()) {
    arg.forEach((val, idx) => {
      if (
        idx === arg.length - 1 &&
        index === values.length - 1 &&
        val.type === 'space'
      ) {
        return;
      }
      nodes.push(val);
    });

    if (index !== values.length - 1) {
      nodes[nodes.length - 1].type = 'div';
      nodes[nodes.length - 1].value = ',';
    }
  }
  return nodes;
}
