'use strict';
/** @type {(nodes: Iterable<import('postcss').AnyNode>, prop: string) => import('postcss').Declaration} */
module.exports = (nodes, prop) => {
  /** @type {import('postcss').Declaration | undefined} */
  let last;
  for (const node of nodes) {
    if (node.type === 'decl' && node.prop.toLowerCase() === prop) {
      last = node;
    }
  }
  return /** @type {import('postcss').Declaration} */ (last);
};
