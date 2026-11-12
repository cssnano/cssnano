import type { BlockDeclarations } from '../blockDeclarations.js';
import type { ValueComponent } from '../componentRanges.js';
/**
 * The byte cost of the declarations at the positions, as `declSize` gives it.
 *
 * @param {BlockDeclarations} list
 * @param {Iterable<number>} positions
 * @param {boolean} [important]
 * @return {number}
 */
export declare function positionsSize(list: BlockDeclarations, positions: Iterable<number>, important?: boolean): number;
/**
 * @param {string[]} cells
 * @param {(ValueComponent | undefined)[]} cellComponents
 * @param {Set<number>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {boolean} hasReset
 * @param {boolean} lane
 * @param {Set<number>} fallbacks
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 */
export declare function generateCandidates(cells: string[], cellComponents: (ValueComponent | undefined)[], cellHistory: Set<number>[], touched: Set<number>, barrierCells: Set<number>, hasReset: boolean, lane: boolean, fallbacks: Set<number>, list: BlockDeclarations, features: ReadonlySet<string>): {
    decls: {
        prop: string;
        value: string;
    }[];
    rank: number;
    mask: number;
    coveredCells: Set<number>;
}[];
/**
 * @param {BlockDeclarations} list
 * @param {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex?: number, coveredCells: Set<number> }[]} candidates
 * @param {Set<number>[]} cellHistory
 * @param {Set<number>} fallbacks
 * @param {Set<number>} touched
 * @param {boolean} lane
 * @param {number[]} segment
 * @return {{ cand: (typeof candidates)[0], repList: number[], removable: number[], diff: number, size: number, fallbacks: Set<number> } | null}
 */
export declare function selectBestCandidate(list: BlockDeclarations, candidates: {
    decls: {
        prop: string;
        value: string;
    }[];
    rank: number;
    mask: number;
    resetIndex?: number;
    coveredCells: Set<number>;
}[], cellHistory: Set<number>[], fallbacks: Set<number>, touched: Set<number>, lane: boolean, segment: number[]): {
    cand: (typeof candidates)[0];
    repList: number[];
    removable: number[];
    diff: number;
    size: number;
    fallbacks: Set<number>;
} | null;
/**
 * @param {BlockDeclarations} list
 * @param {{ cand: { decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }, repList: number[], removable: number[], diff: number, size: number, fallbacks: Set<number> }} best
 * @param {number[]} segment
 * @param {boolean} lane
 */
export declare function applyBestCandidate(list: BlockDeclarations, best: {
    cand: {
        decls: {
            prop: string;
            value: string;
        }[];
        rank: number;
        mask: number;
        coveredCells: Set<number>;
    };
    repList: number[];
    removable: number[];
    diff: number;
    size: number;
    fallbacks: Set<number>;
}, segment: number[], lane: boolean): void;
//# sourceMappingURL=borderCandidates.d.ts.map