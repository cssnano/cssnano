import type { BoxSupport } from './targetSupport.js';
import type { RunContext } from '../../../ir/runContext.js';
import type { BlockDeclarations } from './blockDeclarations.js';
import type { BlockRecords } from '../rules/blockRecords.js';
import type { ArenaIndex } from '../rules/blockRecord.js';
export type Block = {
    container: ArenaIndex;
    list: BlockDeclarations;
};
import type { PairFamily } from './decl/pairForms.js';
import type { AlignmentFamilyConfig } from './decl/alignmentForms.js';
export type MergeContext = {
    columnRules: {
        block: Block;
        positions: number[];
        lanes: [number[], number[]];
    }[];
    setsOtherColumn: boolean;
    placeShorthands: boolean;
    boxSupport: BoxSupport;
    pairShorthands: ReadonlySet<string>;
    features: ReadonlySet<string>;
    run: RunContext;
    records: BlockRecords;
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
 * @param {BlockRecords} records the records the round reads and edits
 * @return {MergeContext} the state that the rounds of one run share
 */
export declare function longhandContext(placeShorthands: boolean, boxSupport: BoxSupport, pairShorthands: ReadonlySet<string>, run: RunContext, records: BlockRecords): MergeContext;
/**
 * The longhand round on the records: the root's own declarations are folded,
 * then every block that holds a declaration, then the columns are finished.
 *
 * @param {BlockRecords} records
 * @param {MergeContext} context a context made with the records
 * @return {void}
 */
export declare function canonicalizeRecords(records: BlockRecords, context: MergeContext): void;
//# sourceMappingURL=canonicalize.d.ts.map