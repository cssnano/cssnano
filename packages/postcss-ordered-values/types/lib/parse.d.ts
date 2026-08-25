/**
 * Serialize immutable CSSTools component values without reconstructing their
 * source. Reducers receive immutable ComponentValue[] and must not construct
 * legacy postcss-value-parser node shapes.
 *
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes
 */
declare function serializeComponentValues(nodes: import('@csstools/css-parser-algorithms').ComponentValue[]): string;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function getNumericUnit(node: import('@csstools/css-parser-algorithms').ComponentValue): {
    number: string;
    unit: string;
} | undefined;
/** @param {string} value */
declare function parseComponentValues(value: string): import("@csstools/css-parser-algorithms").ComponentValue[];
export { parseComponentValues, serializeComponentValues, getNumericUnit };
//# sourceMappingURL=parse.d.ts.map