declare const _exports: {
    isFallback: typeof isFallback;
    hasFallback: typeof hasFallback;
};
export = _exports;
/**
 * Authors write a fallback by declaring a property twice, where the later
 * value uses syntax older browsers cannot parse; those browsers drop the
 * later declaration and keep the earlier one. Discarding the earlier
 * declaration, or folding it into a shorthand, therefore changes rendering.
 *
 * A later value that reaches for a support gate the earlier one does not use is
 * assumed to be such an enhancement.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean} whether earlier is a fallback for later
 */
declare function isFallback(earlier: import('postcss').Declaration, later: import('postcss').Declaration): boolean;
/**
 * Whether any of the declarations could be a fallback for one that follows it,
 * which is what the transforms have to work around. Reading each value once is
 * enough: no declaration is an enhancement over the ones before it as long as
 * every one of them already calls the gates it does.
 *
 * @param {import('postcss').Declaration[]} declarations in document order
 * @return {boolean}
 */
declare function hasFallback(declarations: import('postcss').Declaration[]): boolean;
//# sourceMappingURL=isFallback.d.ts.map