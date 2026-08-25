/** @param {string} value */
declare function parse(value: string): import("@csstools/css-parser-algorithms").ComponentValue[];
/**
 * Serializes immutable component values, replacing only components selected by
 * the caller. Function and simple-block delimiters remain their original
 * source, which is important for malformed-but-processable declarations.
 *
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values
 * @param {Map<import('@csstools/css-parser-algorithms').ComponentValue, string>} replacements
 */
declare function serialize(values: import('@csstools/css-parser-algorithms').ComponentValue[], replacements?: Map<import('@csstools/css-parser-algorithms').ComponentValue, string>): any;
/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values
 * @param {(node: import('@csstools/css-parser-algorithms').ComponentValue, parent: import('@csstools/css-parser-algorithms').ComponentValue[] | undefined) => boolean | void} callback
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[] | undefined} parent
 */
declare function walk(values: import('@csstools/css-parser-algorithms').ComponentValue[], callback: (node: import('@csstools/css-parser-algorithms').ComponentValue, parent: import('@csstools/css-parser-algorithms').ComponentValue[] | undefined) => boolean | void, parent: import('@csstools/css-parser-algorithms').ComponentValue[] | undefined): void;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function isIdentifier(node: import('@csstools/css-parser-algorithms').ComponentValue): boolean;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function isString(node: import('@csstools/css-parser-algorithms').ComponentValue): boolean;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function isNumeric(node: import('@csstools/css-parser-algorithms').ComponentValue): boolean;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function isSlash(node: import('@csstools/css-parser-algorithms').ComponentValue): boolean;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function name(node: import('@csstools/css-parser-algorithms').ComponentValue): string;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function decoded(node: import('@csstools/css-parser-algorithms').ComponentValue): string;
/** @param {import('@csstools/css-parser-algorithms').FunctionNode} node */
declare function argumentsOf(node: import('@csstools/css-parser-algorithms').FunctionNode): never[][];
export { argumentsOf, decoded, isIdentifier, isNumeric, isSlash, isString, name, parse, serialize, walk, };
//# sourceMappingURL=components.d.ts.map