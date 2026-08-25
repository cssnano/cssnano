/** @param {string} value */
declare function parse(value: string): import("@csstools/css-parser-algorithms").ComponentValue[];
/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes */
declare function stringify(nodes: import('@csstools/css-parser-algorithms').ComponentValue[]): string;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function isComma(node: import('@csstools/css-parser-algorithms').ComponentValue): boolean;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function isSlash(node: import('@csstools/css-parser-algorithms').ComponentValue): boolean;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function isNumeric(node: import('@csstools/css-parser-algorithms').ComponentValue): boolean;
export { isComma, isNumeric, isSlash, parse, stringify };
//# sourceMappingURL=parse.d.ts.map