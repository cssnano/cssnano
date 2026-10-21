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
 * Replace the value and keep the raw in step, so serialization does not
 * restore the previous source text.
 *
 * @param {import('postcss').Declaration} decl
 * @param {string} value
 * @return {void}
 */
declare function assignValue(decl: import('postcss').Declaration, value: string): void;
export { assignValue, sourceValue };
//# sourceMappingURL=declValue.d.ts.map