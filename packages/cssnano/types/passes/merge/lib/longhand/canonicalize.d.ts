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
    /** Whether the last `finishColumns` found such a block. */
    setsOtherColumn: boolean;
    /**
     * Whether this is the second round of its run. It gathers no column rule
     * and no fact; it reduces a block's columns as it reaches them, using the
     * first round's `setsOtherColumn`.
     * @type {boolean}
     */
    secondRound: boolean;
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
     * Reduces a rule or at-rule block that holds a declaration; other entries are left alone.
     * @param {BlockRecords} records
     * @param {ArenaIndex} index the entry the round reaches
     * @return {void}
     */
    block(records: BlockRecords, index: ArenaIndex): void;
    /**
     * The second round of this run. It shares these tables, and the first
     * round's column fact, which `finishColumns` has set. Call it after
     * `finishColumns`.
     * @return {LonghandRound}
     */
    second(): LonghandRound;
    /**
     * Reduces the column rules once every block is canonicalized, since a column
     * property set elsewhere is a whole-stylesheet fact; commits each column block once.
     * @param {BlockRecords} records
     * @return {void}
     */
    finishColumns(records: BlockRecords): void;
}
/**
 * @param {boolean} placeShorthands
 * @param {BoxSupport} boxSupport
 * @param {ReadonlySet<string>} pairShorthands
 * @param {RunContext} run the run whose tables and features the rounds read
 * @return {LonghandRound} the round that the rounds of one run share
 */
export declare function longhandContext(placeShorthands: boolean, boxSupport: BoxSupport, pairShorthands: ReadonlySet<string>, run: RunContext): LonghandRound;
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