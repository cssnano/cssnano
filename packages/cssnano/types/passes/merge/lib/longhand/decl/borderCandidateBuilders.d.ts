import type { Declaration } from 'postcss';
import type { TextTable } from '../../../../../values/textTable.js';
import type { CellRanges } from './borderCells.js';
/** @import {Declaration} from 'postcss'; */
/** @import {TextTable} from '../../../../../values/textTable.js' */
/** @import {CellRanges} from './borderCells.js' */
/** @param {{prop: string, value: string}[]} decls @param {boolean} [important] */
declare function declSize(decls: {
    prop: string;
    value: string;
}[], important?: boolean): number;
declare const RESET_CANDIDATE = 1;
declare const COMPONENT_SHORTHAND_CANDIDATE = 2;
declare const SIDE_SHORTHAND_CANDIDATE = 3;
/**
 * A shorthand fills several cells, so a declaration appears once per cell it
 * set; collecting into a Set makes each one count once.
 *
 * @param {Set<Declaration>[]} cellHistory
 * @param {Iterable<number>} cellIndexes
 * @return {Set<Declaration>}
 */
declare function declarationsOfCells(cellHistory: Set<Declaration>[], cellIndexes: Iterable<number>): Set<Declaration>;
/**
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {Set<Declaration>} fallbacks
 * @param {TextTable} textTable
 * @return {number[]}
 */
declare function getAvailableSides(cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>, textTable: TextTable): number[];
/**
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {TextTable} textTable
 * @return {number[]}
 */
declare function getAvailableComponents(cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, textTable: TextTable): number[];
/**
 * @param {number[][]} groups
 * @param {string[]} cells
 * @param {CellRanges} cellRanges
 * @param {Set<number>} touched
 * @param {Set<number>} blockedCells
 * @param {boolean} componentGroups
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }}
 */
declare function createGroupCandidate(groups: number[][], cells: string[], cellRanges: CellRanges, touched: Set<number>, blockedCells: Set<number>, componentGroups: boolean): {
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
 * @param {CellRanges} cellRanges
 * @param {boolean} lane
 * @param {Set<Declaration>} fallbacks
 * @param {TextTable} textTable
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex: number, coveredCells: Set<number> }[]}
 */
declare function createResetCandidates(hasReset: boolean, touched: Set<number>, barrierCells: Set<number>, cellHistory: Set<Declaration>[], cells: string[], cellRanges: CellRanges, lane: boolean, fallbacks: Set<Declaration>, textTable: TextTable): {
    decls: {
        prop: string;
        value: string;
    }[];
    rank: number;
    mask: number;
    resetIndex: number;
    coveredCells: Set<number>;
}[];
export { COMPONENT_SHORTHAND_CANDIDATE, RESET_CANDIDATE, SIDE_SHORTHAND_CANDIDATE, createGroupCandidate, createLeafCandidate, createResetCandidates, declSize, declarationsOfCells, getAvailableComponents, getAvailableSides, };
//# sourceMappingURL=borderCandidateBuilders.d.ts.map