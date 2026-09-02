/**
 * Remove declarations superseded by the last remaining declaration for a
 * family. Detection is cached for this cleanup pass because it checks the
 * same declarations against several later candidates.
 *
 * @param {Set<import('postcss').Declaration>} declarations
 * @param {(node: import('postcss').Declaration, lastNode: import('postcss').Declaration) => boolean} isLowerPrecedence
 * @return {void}
 */
declare function cleanupDeclarations(declarations: Set<import('postcss').Declaration>, isLowerPrecedence: (node: import('postcss').Declaration, lastNode: import('postcss').Declaration) => boolean): void;
export default cleanupDeclarations;
//# sourceMappingURL=cleanupDeclarations.d.ts.map