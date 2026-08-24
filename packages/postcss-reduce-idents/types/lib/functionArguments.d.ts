/**
 * Splits a parsed function into its arguments, e.g. `counter(x, y)` into the
 * nodes making up `x` and those making up `y`. The value parser reports the
 * separating commas as `div` nodes.
 *
 * @param {import('postcss-value-parser').FunctionNode} node
 * @return {import('postcss-value-parser').Node[][]}
 */
declare function functionArguments(node: import('postcss-value-parser').FunctionNode): import('postcss-value-parser').Node[][];
export default functionArguments;
//# sourceMappingURL=functionArguments.d.ts.map