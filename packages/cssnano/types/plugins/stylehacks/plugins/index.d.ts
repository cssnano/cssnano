declare const plugins: ({
    new (result?: import('postcss').Result | undefined): {
        detect(rule: import('postcss').Rule): void;
        nodes: import("../plugin.js").NodeWithInfo[];
        nodeTypes: Set<string>;
        bug: "ie-zero-unit-retention" | "media-all-ie10-11" | "stylehacks-body-empty-firefox2" | "stylehacks-html-combinator-comment-body-ie5.5-7" | "stylehacks-html-first-child-opera9" | "stylehacks-important-ie5.5-7" | "stylehacks-leading-star-ie5.5-7" | "stylehacks-leading-underscore-ie6" | "stylehacks-media-slash0-ie8" | "stylehacks-media-slash0-slash9-ie5.5-8" | "stylehacks-media-slash9-ie5.5-7" | "stylehacks-slash9-ie6-8" | "stylehacks-star-html-ie5.5-6" | "stylehacks-trailing-slash-comma-ie5.5-7" | "transparent-click-ie8-9" | "unicode-range-lowercase-u";
        result: import("postcss").Result<import("postcss").Document | import("postcss").Root> | undefined;
        browsers: readonly string[];
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
        detect(decl: import('postcss').Declaration): void;
        nodes: import("../plugin.js").NodeWithInfo[];
        nodeTypes: Set<string>;
        bug: "ie-zero-unit-retention" | "media-all-ie10-11" | "stylehacks-body-empty-firefox2" | "stylehacks-html-combinator-comment-body-ie5.5-7" | "stylehacks-html-first-child-opera9" | "stylehacks-important-ie5.5-7" | "stylehacks-leading-star-ie5.5-7" | "stylehacks-leading-underscore-ie6" | "stylehacks-media-slash0-ie8" | "stylehacks-media-slash0-slash9-ie5.5-8" | "stylehacks-media-slash9-ie5.5-7" | "stylehacks-slash9-ie6-8" | "stylehacks-star-html-ie5.5-6" | "stylehacks-trailing-slash-comma-ie5.5-7" | "transparent-click-ie8-9" | "unicode-range-lowercase-u";
        result: import("postcss").Result<import("postcss").Document | import("postcss").Root> | undefined;
        browsers: readonly string[];
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