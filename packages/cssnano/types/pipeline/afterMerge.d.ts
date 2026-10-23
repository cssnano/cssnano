import type { Result, Root } from 'postcss';
import type { SymbolTransform } from './host.js';
/** @import {AnyNode, ChildNode, Result, Root} from 'postcss' */
/** @import {CharsetScan} from '#postcss-normalize-charset' */
/** @import {SymbolTransform} from './host.js' */
/** @import {SymbolLists} from './symbolLists.js' */
/**
 * The walk after merge runs the whole-stylesheet transforms that need the tree
 * as merge left it. Per-node transforms share one walk, so no transform needs
 * its own. The advanced transforms then edit the lists the walk collected. The
 * charset decision follows them, and the raw cache records last, so no later
 * transform changes what the cache describes.
 *
 * @param {Root} root
 * @param {Result} result
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on, by entry name
 * @param {ReadonlyMap<string, {transform: SymbolTransform, options: Record<PropertyKey, unknown>}>} symbols
 *   the advanced transforms on, in order
 * @returns {void}
 */
export declare function walkAfterMerge(root: Root, result: Result, transforms: ReadonlyMap<string, Record<PropertyKey, unknown>>, symbols: ReadonlyMap<string, {
    transform: SymbolTransform;
    options: Record<PropertyKey, unknown>;
}>): void;
//# sourceMappingURL=afterMerge.d.ts.map