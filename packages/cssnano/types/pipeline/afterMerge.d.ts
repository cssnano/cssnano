import type { Result, Root } from 'postcss';
/** @import {AnyNode, Result, Root} from 'postcss' */
/**
 * The walk after merge runs the whole-stylesheet transforms that need the tree
 * as merge left it. Per-node transforms share one walk, so no transform needs
 * its own. It records the raw cache last, so no later transform
 * changes what the cache describes.
 *
 * @param {Root} root
 * @param {Result} result
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on, by entry name
 * @returns {void}
 */
export declare function walkAfterMerge(root: Root, result: Result, transforms: ReadonlyMap<string, Record<PropertyKey, unknown>>): void;
//# sourceMappingURL=afterMerge.d.ts.map