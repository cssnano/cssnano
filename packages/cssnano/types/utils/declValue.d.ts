/**
 * The value as written, so a transform sees comments and escapes that
 * PostCSS strips from `decl.value`. The raw is trusted only while its cleaned
 * value still matches, since a stale raw would resurrect an overwritten value.
 *
 * @param {import('postcss').Declaration} decl
 * @return {string}
 */
declare function sourceValue(decl: import('postcss').Declaration): string;
export { sourceValue };
//# sourceMappingURL=declValue.d.ts.map