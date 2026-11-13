/**
 * Moves the comments PostCSS kept only in the raw selector into the selector,
 * as PostCSS itself does for a comment with no whitespace beside it. Later
 * transforms rebuild selectors from `rule.selectors`, which would otherwise
 * lose them.
 *
 * @param {import('postcss').Rule} rule
 */
export function keepSelectorComments(rule) {
  const raw = rule.raws.selector;
  if (
    raw === undefined ||
    raw.value !== rule.selector ||
    raw.raw === raw.value
  ) {
    return;
  }
  rule.selector = raw.raw;
  delete rule.raws.selector;
}
