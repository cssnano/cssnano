/**
 * The value as written, so a transform sees comments and escapes that
 * PostCSS strips from `decl.value`. The raw is trusted only while its cleaned
 * value still matches, since a stale raw would resurrect an overwritten value.
 *
 * @param {import('postcss').Declaration} decl
 * @return {string}
 */
declare function sourceValue(decl: import('postcss').Declaration): string;
/**
 * The prelude as written, so a rewrite keeps the comments that PostCSS strips
 * from `params`, as a declaration value keeps them. The raw is trusted only
 * while it still matches `params`.
 *
 * @param {import('postcss').AtRule} atRule
 * @returns {string}
 */
declare function sourceParams(atRule: import('postcss').AtRule): string;
/**
 * The selector as written, so a rewrite keeps the comments that PostCSS strips
 * from `selector`. The raw is trusted only while it still matches `selector`.
 *
 * @param {import('postcss').Rule} rule
 * @returns {string}
 */
declare function sourceSelector(rule: import('postcss').Rule): string;
export { sourceParams, sourceSelector, sourceValue };
//# sourceMappingURL=sourceText.d.ts.map