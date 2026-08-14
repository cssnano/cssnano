declare const _exports: {
    requiredGates: typeof requiredGates;
    mergeBlockingGates: typeof mergeBlockingGates;
    inheritGates: typeof inheritGates;
    isDerived: typeof isDerived;
    isFallback: typeof isFallback;
};
export = _exports;
/**
 * @param {import('postcss').Declaration} declaration
 * @return {Set<string>} every gate a browser had to understand for the
 * declaration to apply: the ones its value calls, and the ones the declaration
 * it was cloned from needed
 */
declare function requiredGates(declaration: import('postcss').Declaration): Set<string>;
/**
 * @param {import('postcss').Declaration} source
 * @param {import('postcss').Declaration} clone taken from source
 * @return {void}
 */
declare function inheritGates(source: import('postcss').Declaration, clone: import('postcss').Declaration): void;
/**
 * The map answers this too: nothing records a declaration the author wrote,
 * only one the plugin made out of another. A value the plugin invented, such
 * as the `currentcolor` standing for the colour `border: medium none` never
 * named, cannot be a fallback anybody wrote.
 *
 * @param {import('postcss').Declaration} declaration
 * @return {boolean} whether the plugin created the declaration
 */
declare function isDerived(declaration: import('postcss').Declaration): boolean;
/**
 * @param {import('postcss').Declaration} declaration
 * @return {Set<string>} the gates out of `requiredGates` that stop a merge
 */
declare function mergeBlockingGates(declaration: import('postcss').Declaration): Set<string>;
/**
 * Authors write a fallback by declaring a property twice, where the later
 * value uses syntax older browsers cannot parse; those browsers drop the
 * later declaration and keep the earlier one. Discarding the earlier
 * declaration, or folding it into a shorthand, therefore changes rendering.
 *
 * A later declaration that needs a support gate the earlier one does not is
 * assumed to be such an enhancement.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean} whether earlier is a fallback for later
 */
declare function isFallback(earlier: import('postcss').Declaration, later: import('postcss').Declaration): boolean;
//# sourceMappingURL=isFallback.d.ts.map