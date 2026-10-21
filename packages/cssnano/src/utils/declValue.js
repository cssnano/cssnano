/**
 * The value as written, so a transform sees comments and escapes that
 * PostCSS strips from `decl.value`. The raw is trusted only while its cleaned
 * value still matches, since a stale raw would resurrect an overwritten value.
 *
 * @param {import('postcss').Declaration} decl
 * @return {string}
 */
function sourceValue(decl) {
  return decl.raws.value?.value === decl.value
    ? (decl.raws.value.raw ?? decl.value)
    : decl.value;
}

/**
 * Replace the value and keep the raw in step, so serialization does not
 * restore the previous source text.
 *
 * @param {import('postcss').Declaration} decl
 * @param {string} value
 * @return {void}
 */
function assignValue(decl, value) {
  decl.value = value;
  if (decl.raws.value?.raw) decl.raws.value = { raw: value, value };
}

export { assignValue, sourceValue };
