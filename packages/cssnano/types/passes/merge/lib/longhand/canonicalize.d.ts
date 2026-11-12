import type { BoxSupport } from './targetSupport.js';
import type { TextTable } from '../../../../values/textTable.js';
import type { RunContext } from '../../../ir/runContext.js';
import type { TokenLists } from '../../../ir/tokenLists.js';
import type { ValueIds } from '../../../ir/valueIds.js';
import type { Container } from 'postcss';
import type { NodeBlock } from './nodeDeclarations.js';
export type Options = object;
import type { PairFamily } from './decl/pairForms.js';
import type { AlignmentFamilyConfig } from './decl/alignmentForms.js';
export type MergeContext = {
    columnRules: {
        block: NodeBlock;
        positions: number[];
        lanes: [number[], number[]];
    }[];
    setsOtherColumn: boolean;
    placeShorthands: boolean;
    boxSupport: BoxSupport;
    pairShorthands: ReadonlySet<string>;
    features: ReadonlySet<string>;
    textTable: TextTable;
    tokenLists: TokenLists;
    valueIds: ValueIds;
};
export type FamilyDeclarations = {
    family: PairFamily | AlignmentFamilyConfig;
    decls: number[];
    lanes: [number[], number[]];
};
/**
 * @param {boolean} placeShorthands
 * @param {BoxSupport} boxSupport
 * @param {ReadonlySet<string>} pairShorthands
 * @param {RunContext} run the run whose tables and features the rounds read
 * @return {MergeContext} the state that the rounds of one run share
 */
export declare function longhandContext(placeShorthands: boolean, boxSupport: BoxSupport, pairShorthands: ReadonlySet<string>, run: RunContext): MergeContext;
/**
 * Reduces the column rules once every block of the stylesheet is canonicalized,
 * since whether a column property is set elsewhere is a whole-stylesheet fact.
 * Each column block is committed once, after its column reducers.
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