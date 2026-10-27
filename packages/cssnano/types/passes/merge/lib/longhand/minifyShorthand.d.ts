import { TextTable } from '../../../../values/textTable.js';
import type { Container } from 'postcss';
import type { FoldedSelector } from '../../../../values/textTable.js';
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
 * @param {Map<string, FoldedSelector | null>} [memoTable]
 * @param {string} [property] - the lowercased property name, when known
 * @param {TextTable} [table] the text table the walk left, which holds the
 * declaration's tokens; a fresh one when omitted
 * @return {void}
 */
export declare function foldShorthandDeclaration(decl: import('postcss').Declaration, memoTable?: Map<string, FoldedSelector | null>, property?: string, table?: TextTable): void;
/**
 * Folds immediate shorthand declarations within a container (e.g. root or at-rule).
 * @param {Container} container
 * @param {Map<string, FoldedSelector | null>} shorthandMemoTable
 * @param {TextTable} textTable
 * @return {void}
 */
export declare function foldContainerDeclarations(container: Container, shorthandMemoTable: Map<string, FoldedSelector | null>, textTable: TextTable): void;
/**
 * Full AST traversal fallback for standalone shorthand identity canonicalization.
 *
 * @param {import('postcss').Root} root
 * @return {void}
 */
export default function minifyShorthandIdentities(root: import('postcss').Root): void;
//# sourceMappingURL=minifyShorthand.d.ts.map