declare const T_ESCAPED_SINGLE_QUOTE: {
    type: string;
    value: string;
};
declare const T_ESCAPED_DOUBLE_QUOTE: {
    type: string;
    value: string;
};
declare const T_SINGLE_QUOTE: {
    type: string;
    value: string;
};
declare const T_NEWLINE: {
    type: string;
    value: string;
};
export type StringAstNode = typeof T_ESCAPED_SINGLE_QUOTE | typeof T_ESCAPED_DOUBLE_QUOTE | typeof T_SINGLE_QUOTE | typeof T_NEWLINE;
export type StringAst = {
    nodes: StringAstNode[];
    types: {
        escapedSingleQuote: number;
        escapedDoubleQuote: number;
        singleQuote: number;
        doubleQuote: number;
    };
    quotes: boolean;
};
export type Options = {
    preferredQuote?: 'double' | 'single';
};
/** @typedef {{preferredQuote?: 'double' | 'single'}} Options */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map