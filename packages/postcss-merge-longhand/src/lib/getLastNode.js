/**
 * @param {Iterable<import('postcss').Declaration>} nodes
 * @param {string} prop
 */
export default (nodes, prop) => {
  /** @type {import('postcss').Declaration | undefined} */
  let last;
  for (const node of nodes) {
    if (node.prop.toLowerCase() === prop) {
      last = node;
    }
  }
  return /** @type {import('postcss').Declaration} */ (last);
};
