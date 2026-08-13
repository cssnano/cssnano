declare const _exports: import("postcss").PluginCreator<void>;
export = _exports;
export type ComparableNode = {
    type: string;
    important?: boolean;
    raws: {
        before?: string;
        afterName?: string;
    };
    selector?: string;
    name?: string;
    params?: string;
    prop?: string;
    value?: string;
    nodes?: import('postcss').ChildNode[];
};
//# sourceMappingURL=index.d.ts.map