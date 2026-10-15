import { classifyDeclaration } from './grammar.js';
export type Reference = {
    decl: import('postcss').Declaration;
    classification: NonNullable<ReturnType<typeof classifyDeclaration>>;
    value: string;
};
/**
 * @typedef {{
 *   decl: import('postcss').Declaration,
 *   classification: NonNullable<ReturnType<typeof classifyDeclaration>>,
 *   value: string
 * }} Reference
 */
/**
 * One walk over the stylesheet's declarations that finds the names substituted
 * text may spell and the declarations that reference keyframes or counter
 * styles. Substituted text is custom property values, `@property` initial
 * values, `@function` definitions, and references inside functions other than
 * the known counter-function argument slots. Declaration walks do not rewrite
 * such names, so they must protect their definitions.
 *
 * The invariant: every place a name is spelled is either rewritten when its
 * definition is removed or keeps that definition. A spelling that no
 * declaration rewrite reaches therefore has to be collected here.
 *
 * @param {import('postcss').Root} css
 * @param {Set<string>} candidates the names that may be merged; only they
 *   need protection
 * @param {import('postcss').AtRule[]} functionRules the `@function` rules
 * @param {import('postcss').AtRule[]} parameterRules the `@mixin` and
 *   `@apply` rules, whose parameter defaults and arguments are substituted
 * @param {import('postcss').AtRule[]} conditionRules the `@container`, `@when`
 *   and `@else` rules, whose preludes may test a property in a style query
 * @return {{ protectedNames: Set<string>, references: Reference[] }}
 */
declare function scanDeclarations(css: import('postcss').Root, candidates: Set<string>, functionRules: import('postcss').AtRule[], parameterRules: import('postcss').AtRule[], conditionRules: import('postcss').AtRule[]): {
    protectedNames: Set<string>;
    references: Reference[];
};
export { scanDeclarations };
//# sourceMappingURL=protectedNames.d.ts.map