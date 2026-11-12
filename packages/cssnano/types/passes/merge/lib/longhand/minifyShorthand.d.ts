import type { BlockDeclarations } from './blockDeclarations.js';
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
 * @param {BlockDeclarations} list
 * @param {number} position
 * @param {string} [property] - the lowercased property name, when known
 * @return {void}
 */
export declare function foldShorthandDeclaration(list: BlockDeclarations, position: number, property?: string): void;
/**
 * Folds the shorthand declarations of a container's block. A value with an
 * important comment is kept as written, so it is left as it is.
 *
 * @param {BlockDeclarations} list
 * @param {readonly number[]} chain - the positions of the block's declarations
 * @return {void}
 */
export declare function foldContainerDeclarations(list: BlockDeclarations, chain: readonly number[]): void;
/**
 * Full AST traversal fallback for standalone shorthand identity canonicalization.
 *
 * @param {import('postcss').Root} root
 * @return {void}
 */
export default function minifyShorthandIdentities(root: import('postcss').Root): void;
//# sourceMappingURL=minifyShorthand.d.ts.map