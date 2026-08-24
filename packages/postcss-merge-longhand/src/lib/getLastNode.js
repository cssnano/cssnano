export default (nodes, prop) => {
  /** @type {import('postcss').Declaration | undefined} */
  let last;
  for (const node of nodes) {
    if (node.type === 'decl' && node.prop.toLowerCase() === prop) {
      last = node;
    }
  }
  return /** @type {import('postcss').Declaration} */ (last);
};
