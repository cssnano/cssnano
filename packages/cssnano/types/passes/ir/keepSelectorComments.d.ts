/**
 * Moves the comments PostCSS kept only in the raw selector into the selector,
 * as PostCSS itself does for a comment with no whitespace beside it. Later
 * transforms rebuild selectors from `rule.selectors`, which would otherwise
 * lose them.
 *
 * @param {import('postcss').Rule} rule
 */
export declare function keepSelectorComments(rule: import('postcss').Rule): void;
//# sourceMappingURL=keepSelectorComments.d.ts.map