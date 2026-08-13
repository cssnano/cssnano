export = _exports;
/**
 * Only browsers that can parse a shorthand in full apply any of it, so folding
 * a declaration that overrides a fallback strands that fallback: browsers that
 * keep it read the shorthand instead and lose every other property in it.
 *
 * When each declaration is itself preceded by one for the same property, the
 * layer left behind is complete and merges into its own, earlier shorthand, so
 * the merge is safe. The mixed case is the one to abandon.
 *
 * @param {import('postcss').Declaration[]} rules
 * @param {Iterable<import('postcss').Declaration>} candidates in document order
 * @return {boolean}
 */
declare function _exports(rules: import('postcss').Declaration[], candidates: Iterable<import('postcss').Declaration>): boolean;
//# sourceMappingURL=skipsFallback.d.ts.map