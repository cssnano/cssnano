declare const plugins: ({
    new (result?: import('postcss').Result | undefined): {
        detect(decl: import('postcss').Declaration): void;
        nodes: import("../plugin.js").NodeWithInfo[];
        targets: Set<string>;
        nodeTypes: Set<string>;
        result: import("postcss").Result<import("postcss").Document | import("postcss").Root> | undefined;
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
        nodes: import("../plugin.js").NodeWithInfo[];
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
/**
 * Detectors grouped by the PostCSS node types they accept. `detect()` uses
 * this to avoid constructing detectors that cannot inspect the given node.
 *
 * @type {Record<string, (typeof plugins)[number][]>}
 */
export declare const pluginsByNodeType: Record<string, (typeof plugins)[number][]>;
export default plugins;
//# sourceMappingURL=index.d.ts.map