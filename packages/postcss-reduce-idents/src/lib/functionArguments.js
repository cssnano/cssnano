/**
 * Splits a parsed function into its arguments, e.g. `counter(x, y)` into the
 * nodes making up `x` and those making up `y`. The value parser reports the
 * separating commas as `div` nodes.
 *
 * @param {{nodes?: unknown[]}} node
 * @return {unknown[][]}
 */
function functionArguments(node) {
  /** @type {unknown[][]} */
  const args = [[]];

  for (const child of node.nodes ?? []) {
    if (
      /** @type {{type?: string, value?: string}} */ (child).type === 'div' &&
      /** @type {{value?: string}} */ (child).value === ','
    ) {
      args.push([]);
      continue;
    }

    args[args.length - 1].push(child);
  }
  return args;
}

export default functionArguments;
