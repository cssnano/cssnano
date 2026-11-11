import type { BoxSupport } from './targetSupport.js';
import type { FoldedText, TextTable } from '../../../../values/textTable.js';
import type { Container, Declaration } from 'postcss';
export type Options = object;
import type { PairFamily } from './decl/pairForms.js';
import type { AlignmentFamilyConfig } from './decl/alignmentForms.js';
export type MergeContext = {
    columnRules: [Container, Declaration[], [Declaration[], Declaration[]]][];
    setsOtherColumn: boolean;
    shorthandMemoTable: Map<string, FoldedText | null>;
    placeShorthands: boolean;
    boxSupport: BoxSupport;
    pairShorthands: ReadonlySet<string>;
    features: ReadonlySet<string>;
    textTable: TextTable;
};
export type FamilyDeclarations = {
    family: PairFamily | AlignmentFamilyConfig;
    decls: Declaration[];
    lanes: [Declaration[], Declaration[]];
};
/**
 * @param {boolean} placeShorthands
 * @param {BoxSupport} boxSupport
 * @param {ReadonlySet<string>} pairShorthands
 * @param {TextTable} textTable the tokens the walk left for the declarations
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {MergeContext} the state that the rounds of one run share
 */
export declare function longhandContext(placeShorthands: boolean, boxSupport: BoxSupport, pairShorthands: ReadonlySet<string>, textTable: TextTable, features: ReadonlySet<string>): MergeContext;
/**
 * Reduces the column rules once every block of the stylesheet is canonicalized,
 * since whether a column property is set elsewhere is a whole-stylesheet fact.
 *
 * @param {MergeContext} context
 * @return {void}
 */
export declare function finishColumns(context: MergeContext): void;
/**
 * The longhand reducers on one block. The root only folds its own shorthands,
 * since its declarations have no rule to reduce them in. Column rules wait for
 * `finishColumns`, which needs the whole stylesheet.
 *
 * @param {Container} block
 * @param {MergeContext} context
 * @return {void}
 */
export declare function canonicalize(block: Container, context: MergeContext): void;
//# sourceMappingURL=canonicalize.d.ts.map