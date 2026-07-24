declare const _exports: import("postcss").PluginCreator<Options>;
export = _exports;
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
//# sourceMappingURL=index.d.ts.map