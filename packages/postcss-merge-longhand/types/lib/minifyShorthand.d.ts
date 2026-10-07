/**
 * Shorthand properties whose redundant axes, sides, or default components can be
 * algebraically folded in-place without inter-declaration data dependencies.
 */
export declare const foldableShorthands: Set<string>;
/**
 * In-place peephole rewrite: folds identity components of a shorthand declaration
 * using a memoization table to cache pure value transformations across the AST.
 *
 * @param {import('postcss').Declaration} decl
 * @param {Map<string, string | null>} [memoTable]
 * @param {string} [property] - the lowercased property name, when known
 * @return {void}
 */
export declare function foldShorthandDeclaration(decl: import('postcss').Declaration, memoTable?: Map<string, string | null>, property?: string): void;
/**
 * Full AST traversal fallback for standalone shorthand identity canonicalization.
 *
 * @param {import('postcss').Root} root
 * @return {void}
 */
export default function minifyShorthandIdentities(root: import('postcss').Root): void;
//# sourceMappingURL=minifyShorthand.d.ts.map