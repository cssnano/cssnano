/**
 * Splits a parsed function into its arguments, e.g. `counter(x, y)` into the
 * nodes making up `x` and those making up `y`. The value parser reports the
 * separating commas as `div` nodes.
 *
 * @param {import('postcss-value-parser').FunctionNode} node
 * @return {import('postcss-value-parser').Node[][]}
 */
function functionArguments(node) {
  /** @type {import('postcss-value-parser').Node[][]} */
  const args = [[]];

  for (const child of node.nodes) {
    if (child.type === 'div' && child.value === ',') {
      args.push([]);
      continue;
    }

    args[args.length - 1].push(child);
  }
  return args;
}

export default functionArguments;
