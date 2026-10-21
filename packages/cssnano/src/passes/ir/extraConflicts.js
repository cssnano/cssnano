/**
 * Property names that set the same side as another property but that webref
 * does not list as an alias of it. Each entry is `[name, aliasOf]`.
 *
 * Firefox 41 to 62 spelled the flow-relative insets with an `offset-` prefix,
 * so `offset-block-start` set `inset-block-start` in those versions.
 *
 * @type {[string, string][]}
 */
export const extraAliases = [
  ['offset-block-start', 'inset-block-start'],
  ['offset-block-end', 'inset-block-end'],
  ['offset-inline-start', 'inset-inline-start'],
  ['offset-inline-end', 'inset-inline-end'],
];
