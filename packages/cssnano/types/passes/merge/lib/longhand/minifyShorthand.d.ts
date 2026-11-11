import { TextTable } from '../../../../values/textTable.js';
import type { Container } from 'postcss';
/**
 * Shorthand properties whose redundant axes, sides, or default components can be
 * algebraically folded in-place without inter-declaration data dependencies.
 */
export declare const foldableShorthands: Set<string>;
/**
 * In-place peephole rewrite: folds identity components of a shorthand
 * declaration. Each declaration is folded on its own; the fold is cheap enough
 * that a memo per property and source was not worth keeping.
 *
 * @param {import('postcss').Declaration} decl
 * @param {string} [property] - the lowercased property name, when known
 * @param {TextTable} [table] the text table the walk left, which holds the
 * declaration's tokens; a fresh one when omitted
 * @return {void}
 */
export declare function foldShorthandDeclaration(decl: import('postcss').Declaration, property?: string, table?: TextTable): void;
/**
 * Folds immediate shorthand declarations within a container (e.g. root or at-rule).
 * @param {Container} container
 * @param {TextTable} textTable
 * @return {void}
 */
export declare function foldContainerDeclarations(container: Container, textTable: TextTable): void;
/**
 * Full AST traversal fallback for standalone shorthand identity canonicalization.
 *
 * @param {import('postcss').Root} root
 * @return {void}
 */
export default function minifyShorthandIdentities(root: import('postcss').Root): void;
//# sourceMappingURL=minifyShorthand.d.ts.map