/**
 * @param {Set<import('postcss').Declaration>} declarations
 * @param {(node: import('postcss').Declaration, lastNode: import('postcss').Declaration) => boolean} [isLowerPrecedence]
 * @param {(node: import('postcss').Declaration) => Iterable<string>} [footprint]
 */
declare function cleanupDeclarations(declarations: Set<import('postcss').Declaration>, isLowerPrecedence?: (node: import('postcss').Declaration, lastNode: import('postcss').Declaration) => boolean, footprint?: (node: import('postcss').Declaration) => Iterable<string>): void;
export default cleanupDeclarations;
//# sourceMappingURL=cleanupDeclarations.d.ts.map