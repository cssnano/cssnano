/**
 * Property names that set the same side as another property but that webref
 * does not list as an alias of it. Each entry is `[name, aliasOf]`.
 *
 * Firefox 41 to 62 spelled the flow-relative insets with an `offset-` prefix,
 * so `offset-block-start` set `inset-block-start` in those versions.
 *
 * @type {[string, string][]}
 */
export declare const extraAliases: [string, string][];
//# sourceMappingURL=extraConflicts.d.ts.map