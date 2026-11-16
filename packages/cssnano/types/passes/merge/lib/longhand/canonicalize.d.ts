import type { BoxSupport } from './targetSupport.js';
import type { RunContext } from '../../../ir/runContext.js';
import type { BlockDeclarations } from './blockDeclarations.js';
import type { BlockRecords } from '../../../ir/blockRecords.js';
import type { ArenaIndex } from '../../../ir/blockRecord.js';
export type Block = {
    container: ArenaIndex;
    list: BlockDeclarations;
};
/**
 * The longhand round of one run: the column rules and column blocks the
 * rounds gather, and the targets' tables. `finishColumns` clears the gathered
 * state, so one round can serve each pass over the blocks.
 */
export declare class LonghandRound {
    #private;
    placeShorthands: boolean;
    boxSupport: BoxSupport;
    pairShorthands: ReadonlySet<string>;
    features: ReadonlySet<string>;
    run: RunContext;
    /** @type {{block: Block, positions: number[], lanes: [number[], number[]]}[]} */
    columnRules: {
        block: Block;
        positions: number[];
        lanes: [number[], number[]];
    }[];
    /**
     * The blocks that set a column property other than column-width and
     * column-count, each once, in the order the round reached them.
     * @type {ArenaIndex[]}
     */
    otherColumnBlocks: ArenaIndex[];
    /**
     * Whether the last `finishColumns` found such a block. The second pass reads
     * it to reduce a block's columns as it reaches them.
     */
    setsOtherColumn: boolean;
    /**
     * @param {boolean} placeShorthands
     * @param {BoxSupport} boxSupport
     * @param {ReadonlySet<string>} pairShorthands
     * @param {RunContext} run the run whose tables and features the rounds read
     */
    constructor(placeShorthands: boolean, boxSupport: BoxSupport, pairShorthands: ReadonlySet<string>, run: RunContext);
    /**
     * Folds and commits the root's own declarations.
     * @param {BlockRecords} records
     * @return {void}
     */
    root(records: BlockRecords): void;
    /**
     * The first pass: reduces a rule or at-rule block that holds a declaration,
     * and gathers its column rules for `finishColumns`. Other entries are left alone.
     * @param {BlockRecords} records
     * @param {ArenaIndex} index the entry the pass reaches
     * @return {void}
     */
    first(records: BlockRecords, index: ArenaIndex): void;
    /**
     * The second pass, after `finishColumns`: reduces a block's columns with the
     * first pass's `setsOtherColumn`, and commits each block at once. A block
     * whose declarations and child links the build and merge left as they were
     * is skipped, since the first pass already reduced it with the same facts.
     * @param {BlockRecords} records
     * @param {ArenaIndex} index the entry the pass reaches
     * @return {void}
     */
    second(records: BlockRecords, index: ArenaIndex): void;
    /**
     * Reduces the column rules once every block is canonicalized, since a column
     * property set elsewhere is a whole-stylesheet fact; commits each column block once.
     * @param {BlockRecords} records
     * @return {void}
     */
    finishColumns(records: BlockRecords): void;
}
/**
 * The longhand round on the records: the root's own declarations are folded,
 * then every block that holds a declaration, then the columns are finished.
 *
 * @param {BlockRecords} records
 * @param {LonghandRound} round a round made with the records' run
 * @return {void}
 */
export declare function canonicalizeRecords(records: BlockRecords, round: LonghandRound): void;
//# sourceMappingURL=canonicalize.d.ts.map