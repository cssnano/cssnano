declare const _default: ({
    new (result?: import('postcss').Result | undefined): {
        nodes: NodeWithInfo[];
        targets: Set<string>;
        nodeTypes: Set<string>;
        result: import("postcss").Result<import("postcss").Document | import("postcss").Root> | undefined;
        detect(decl: import('postcss').Declaration): void;
        push(node: import('postcss').Node, metadata: {
            identifier: string;
            hack: string;
        }): void;
        any(node: import('postcss').Node): boolean;
        detectAndResolve(node: import('postcss').Node): void;
        detectAndWarn(node: import('postcss').Node): void;
        resolve(): void;
        warn(): void;
    };
} | {
    new (result?: import('postcss').Result | undefined): {
        nodes: NodeWithInfo[];
        targets: Set<string>;
        nodeTypes: Set<string>;
        result: import("postcss").Result<import("postcss").Document | import("postcss").Root> | undefined;
        detect(rule: import('postcss').Rule): void;
        push(node: import('postcss').Node, metadata: {
            identifier: string;
            hack: string;
        }): void;
        any(node: import('postcss').Node): boolean;
        detectAndResolve(node: import('postcss').Node): void;
        detectAndWarn(node: import('postcss').Node): void;
        resolve(): void;
        warn(): void;
    };
})[];
export default _default;
//# sourceMappingURL=index.d.ts.map