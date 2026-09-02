/**
 * Splits a parsed function into its arguments, e.g. `counter(x, y)` into the
 * nodes making up `x` and those making up `y`. The value parser reports the
 * separating commas as `div` nodes.
 *
 * @param {{nodes?: unknown[]}} node
 * @return {unknown[][]}
 */
declare function functionArguments(node: {
    nodes?: unknown[];
}): unknown[][];
export default functionArguments;
//# sourceMappingURL=functionArguments.d.ts.map