import { boxProperties } from './decl/boxGroups.js';
import type { BoxSupport } from './targetSupport.js';
import type { Container, Declaration } from 'postcss';
import type { BoxGroup } from './decl/boxGroups.js';
export type Options = object;
import type { PairFamily } from './decl/pairForms.js';
import type { AlignmentFamilyConfig } from './decl/alignmentForms.js';
export type MergeContext = {
    columnRules: [Container, Declaration[], [Declaration[], Declaration[]]][];
    setsOtherColumn: boolean;
    shorthandMemoTable: Map<string, string | null>;
    familyRecords: Map<string, FamilyRecord>;
    placeShorthands: boolean;
    boxSupport: BoxSupport;
    pairShorthands: ReadonlySet<string>;
};
export type FamilyRecord = {
    pair: PairFamily | undefined;
    boxProperty: ReturnType<typeof boxProperties.get>;
    boxGroup: BoxGroup | undefined;
    alignment: AlignmentFamilyConfig | undefined;
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
 * @return {MergeContext} the state that the rounds of one run share
 */
export declare function longhandContext(placeShorthands: boolean, boxSupport: BoxSupport, pairShorthands: ReadonlySet<string>): MergeContext;
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