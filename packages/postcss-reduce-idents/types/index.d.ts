declare const _exports: import("postcss").PluginCreator<Options>;
export = _exports;
export type Options = {
    counter?: boolean;
    counterStyle?: boolean;
    keyframes?: boolean;
    gridTemplate?: boolean;
    encoder?: (value: string, index: number) => string;
};
export type Reducer = {
    collect: (node: import('postcss').AnyNode, encoder: (value: string, num: number) => string) => void;
    transform: () => void;
};
//# sourceMappingURL=index.d.ts.map