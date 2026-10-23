/**
 * Sets the space after an at-rule name for the prelude that the walk wrote. An
 * empty prelude takes no space. A prelude that starts with a parenthesis takes
 * none either, unless its brackets do not balance, when the prelude is left as
 * written.
 *
 * @param {import('postcss').AtRule} atRule
 * @param {string} prelude the prelude after the walk
 */
export declare function tightenAfterName(atRule: import('postcss').AtRule, prelude: string): void;
//# sourceMappingURL=afterName.d.ts.map