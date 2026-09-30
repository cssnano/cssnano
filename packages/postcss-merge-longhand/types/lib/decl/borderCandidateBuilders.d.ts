import type { Declaration } from 'postcss';
/** @param {{prop: string, value: string}[]} decls @param {boolean} [important] */
declare function declSize(decls: {
    prop: string;
    value: string;
}[], important?: boolean): number;
declare const RESET_CANDIDATE = 1;
declare const COMPONENT_SHORTHAND_CANDIDATE = 2;
declare const SIDE_SHORTHAND_CANDIDATE = 3;
declare const LEAF_CANDIDATE = 4;
/**
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {Set<Declaration>} fallbacks
 * @return {number[]}
 */
declare function getAvailableSides(cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>): number[];
/**
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @return {number[]}
 */
declare function getAvailableComponents(cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>): number[];
/**
 * @param {number[][]} groups
 * @param {string[]} cells
 * @param {Set<number>} touched
 * @param {Set<number>} blockedCells
 * @param {boolean} componentGroups
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }}
 */
declare function createGroupCandidate(groups: number[][], cells: string[], touched: Set<number>, blockedCells: Set<number>, componentGroups: boolean): {
    decls: {
        prop: string;
        value: string;
    }[];
    rank: number;
    mask: number;
    coveredCells: Set<number>;
};
/**
 * @param {string[]} cells
 * @param {Set<number>} touched
 * @param {Set<number>} blockedCells
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }}
 */
declare function createLeafCandidate(cells: string[], touched: Set<number>, blockedCells: Set<number>): {
    decls: {
        prop: string;
        value: string;
    }[];
    rank: number;
    mask: number;
    coveredCells: Set<number>;
};
/**
 * @param {boolean} hasReset
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {Set<Declaration>[]} cellHistory
 * @param {string[]} cells
 * @param {boolean} lane
 * @param {Set<Declaration>} fallbacks
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex: number, coveredCells: Set<number> }[]}
 */
declare function createResetCandidates(hasReset: boolean, touched: Set<number>, barrierCells: Set<number>, cellHistory: Set<Declaration>[], cells: string[], lane: boolean, fallbacks: Set<Declaration>): {
    decls: {
        prop: string;
        value: string;
    }[];
    rank: number;
    mask: number;
    resetIndex: number;
    coveredCells: Set<number>;
}[];
export { COMPONENT_SHORTHAND_CANDIDATE, LEAF_CANDIDATE, RESET_CANDIDATE, SIDE_SHORTHAND_CANDIDATE, createGroupCandidate, createLeafCandidate, createResetCandidates, declSize, getAvailableComponents, getAvailableSides, };
//# sourceMappingURL=borderCandidateBuilders.d.ts.map