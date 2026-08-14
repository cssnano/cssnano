export = _exports;
/**
 * A browser applies a declaration only where it understands every support gate
 * the declaration needs, and it applies a shorthand whole or not at all. So
 * folding declarations into one shorthand is faithful exactly when they all
 * needed the same gates: the shorthand then reaches the browsers each part
 * already reached, and no others.
 *
 * Where the gate sets differ, the shorthand goes to the narrowest audience
 * among them, and the browsers that only understood the rest lose it — along
 * with the fallback the author left for them, which they now read as the
 * shorthand instead.
 *
 * The gates a value calls are not the whole set: a declaration exploded out of
 * a gated shorthand carries its gates without naming them, which is why this
 * asks `mergeBlockingGates` rather than reading the values.
 *
 * @param {import('postcss').Declaration[]} rules
 * @return {boolean}
 */
declare function _exports(rules: import('postcss').Declaration[]): boolean;
//# sourceMappingURL=skipsFallback.d.ts.map