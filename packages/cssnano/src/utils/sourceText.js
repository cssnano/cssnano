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
 * The prelude as written, so a rewrite keeps the comments that PostCSS strips
 * from `params`, as a declaration value keeps them. The raw is trusted only
 * while it still matches `params`.
 *
 * @param {import('postcss').AtRule} atRule
 * @returns {string}
 */
function sourceParams(atRule) {
  const raw = atRule.raws.params;
  return raw !== undefined && raw.value === atRule.params
    ? raw.raw
    : atRule.params;
}

/**
 * The selector as written, so a rewrite keeps the comments that PostCSS strips
 * from `selector`. The raw is trusted only while it still matches `selector`.
 *
 * @param {import('postcss').Rule} rule
 * @returns {string}
 */
function sourceSelector(rule) {
  const raw = rule.raws.selector;
  return raw !== undefined && raw.value === rule.selector
    ? raw.raw
    : rule.selector;
}

export { sourceParams, sourceSelector, sourceValue };
