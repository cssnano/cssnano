export type Plugin = {
    nodeTypes: Set<string>;
    detectAndResolve: (node: import('postcss').Node) => void;
    detectAndWarn: (node: import('postcss').Node) => void;
};
import type { BugKey } from '#utils/browser-bugs';
export type NodeWithInfo = import('postcss').Node & {
    _stylehacks: {
        message: string;
        browsers: readonly string[];
        identifier: string;
        hack: string;
    };
};
export default BasePlugin;
/** @import {BugKey} from '#utils/browser-bugs' */
/**
 * @typedef {import('postcss').Node & {
 *   _stylehacks: {
 *     message: string,
 *     browsers: readonly string[],
 *     identifier: string,
 *     hack: string
 *   }
 * }} NodeWithInfo
 */
declare class BasePlugin {
    /** @type {NodeWithInfo[]} */
    nodes: NodeWithInfo[];
    nodeTypes: Set<string>;
    bug: "ie-zero-unit-retention" | "media-all-ie10-11" | "stylehacks-body-empty-firefox2" | "stylehacks-html-combinator-comment-body-ie5.5-7" | "stylehacks-html-first-child-opera9" | "stylehacks-important-ie5.5-7" | "stylehacks-leading-star-ie5.5-7" | "stylehacks-leading-underscore-ie6" | "stylehacks-media-slash0-ie8" | "stylehacks-media-slash0-slash9-ie5.5-8" | "stylehacks-media-slash9-ie5.5-7" | "stylehacks-slash9-ie6-8" | "stylehacks-star-html-ie5.5-6" | "stylehacks-trailing-slash-comma-ie5.5-7" | "transparent-click-ie8-9" | "unicode-range-lowercase-u";
    result: import("postcss").Result<import("postcss").Document | import("postcss").Root> | undefined;
    browsers: readonly string[];
    /**
     * @typedef {object} Plugin
     * @prop {Set<string>} nodeTypes
     * @prop {(node: import('postcss').Node) => void} detectAndResolve
     * @prop {(node: import('postcss').Node) => void} detectAndWarn
     */
    /**
     * @param {BugKey} bug A browser bug key from utils/data/bugs.json.
     * @param {string[]} nodeTypes
     * @param {import('postcss').Result=} result
     */
    constructor(bug: BugKey, nodeTypes: string[], result?: import('postcss').Result | undefined);
    /**
     * @param {import('postcss').Node} node
     * @param {{identifier: string, hack: string}} metadata
     * @return {void}
     */
    push(node: import('postcss').Node, metadata: {
        identifier: string;
        hack: string;
    }): void;
    /**
     * @param {import('postcss').Node} node
     * @return {boolean}
     */
    any(node: import('postcss').Node): boolean;
    /**
     * @param {import('postcss').Node} node
     * @return {void}
     */
    detectAndResolve(node: import('postcss').Node): void;
    /**
     * @param {import('postcss').Node} node
     * @return {void}
     */
    detectAndWarn(node: import('postcss').Node): void;
    /** @param {import('postcss').Node} node */
    detect(node: import('postcss').Node): void;
    /** @return {void} */
    resolve(): void;
    warn(): void;
}
//# sourceMappingURL=plugin.d.ts.map