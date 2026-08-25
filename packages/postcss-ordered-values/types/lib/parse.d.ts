/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes */
declare function stringify(nodes: import('@csstools/css-parser-algorithms').ComponentValue[]): string;
/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
declare function unit(node: import('@csstools/css-parser-algorithms').ComponentValue): false | {
    number: string;
    unit: string;
};
/** @param {string} value */
declare function parse(value: string): import("@csstools/css-parser-algorithms").ComponentValue[];
export { parse, stringify, unit };
//# sourceMappingURL=parse.d.ts.map