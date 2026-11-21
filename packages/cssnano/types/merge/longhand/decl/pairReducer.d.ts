import type { PairFamily } from './pairForms.js';
import type { BlockDeclarations } from '../blockDeclarations.js';
/**
 * Reduces the longhand pair of one family within a container into its
 * shorthand. Anything the reducer cannot parse leaves the whole family as
 * written: a declaration it does not understand could be a fallback or a
 * hack, and the shorthand would reorder it.
 *
 * @param {BlockDeclarations} list
 * @param {PairFamily} family
 * @param {number[]} declarations - positions in `list`
 * @param {[number[], number[]]} lanes - the declarations and `all` split by
 *   importance
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export declare function reducePairFamily(list: BlockDeclarations, family: PairFamily, declarations: number[], lanes: [number[], number[]], features: ReadonlySet<string>): void;
//# sourceMappingURL=pairReducer.d.ts.map