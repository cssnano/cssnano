import type { Container, Declaration } from 'postcss';
import type { PairFamily } from './pairForms.js';
import type { TextTable } from '../../../../../values/textTable.js';
/**
 * Reduces the longhand pair of one family within a container into its
 * shorthand. Anything the reducer cannot parse leaves the whole family as
 * written: a declaration it does not understand could be a fallback or a
 * hack, and the shorthand would reorder it.
 *
 * @param {Container} rule
 * @param {PairFamily} family
 * @param {Declaration[]} declarations
 * @param {[Declaration[], Declaration[]]} lanes - the declarations and `all`
 *   split by importance
 * @param {TextTable} textTable
 * @return {void}
 */
export declare function reducePairFamily(rule: Container, family: PairFamily, declarations: Declaration[], lanes: [Declaration[], Declaration[]], textTable: TextTable): void;
//# sourceMappingURL=pairReducer.d.ts.map