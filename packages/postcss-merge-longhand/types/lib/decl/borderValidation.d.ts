/**
 * @param {import('postcss').Rule} rule
 * @return {boolean}
 */
export declare function containsUnmergeableBorderDecls(rule: import('postcss').Rule): boolean;
/**
 * @param {import('postcss').Node} node
 * @return {boolean}
 */
declare function establishesBorderReset(node: import('postcss').Node): boolean;
/**
 * @param {import('postcss').Rule} rule
 * @return {boolean}
 */
export declare function hasBorderResetContext(rule: import('postcss').Rule): boolean;
export { establishesBorderReset };
//# sourceMappingURL=borderValidation.d.ts.map