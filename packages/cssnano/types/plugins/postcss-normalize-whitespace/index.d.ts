import type { Stage } from '../../pipeline/host.js';
/** @satisfies {StageEntry} */
export declare const valueEntry: {
    create: () => Stage;
};
/**
 * Trims the raws of one node that are not its value, so the walk after merge
 * can run it on each node it keeps.
 *
 * @param {import('postcss').AnyNode} node
 * @return {void}
 */
export declare function normalizeNodeRaws(node: import('postcss').AnyNode): void;
/**
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map