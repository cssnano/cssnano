import type { BlockDeclarations } from '../blockDeclarations.js';
import type { ValueComponent } from '../componentRanges.js';
/** @import {BlockDeclarations} from '../blockDeclarations.js'; */
/** @import {ValueComponent} from '../componentRanges.js' */
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
 * @param {Set<number>[]} cellHistory
 * @param {Iterable<number>} cellIndexes
 * @return {Set<number>}
 */
declare function declarationsOfCells(cellHistory: Set<number>[], cellIndexes: Iterable<number>): Set<number>;
/**
 * @param {Set<number>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {Set<number>} fallbacks
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {number[]}
 */
declare function getAvailableSides(cellHistory: Set<number>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<number>, list: BlockDeclarations, features: ReadonlySet<string>): number[];
/**
 * @param {Set<number>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {number[]}
 */
declare function getAvailableComponents(cellHistory: Set<number>[], touched: Set<number>, barrierCells: Set<number>, list: BlockDeclarations, features: ReadonlySet<string>): number[];
/**
 * @param {number[][]} groups
 * @param {string[]} cells
 * @param {(ValueComponent | undefined)[]} cellComponents
 * @param {Set<number>} touched
 * @param {Set<number>} blockedCells
 * @param {boolean} componentGroups
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }}
 */
declare function createGroupCandidate(groups: number[][], cells: string[], cellComponents: (ValueComponent | undefined)[], touched: Set<number>, blockedCells: Set<number>, componentGroups: boolean): {
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
 * @param {Set<number>[]} cellHistory
 * @param {string[]} cells
 * @param {(ValueComponent | undefined)[]} cellComponents
 * @param {boolean} lane
 * @param {Set<number>} fallbacks
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex: number, coveredCells: Set<number> }[]}
 */
declare function createResetCandidates(hasReset: boolean, touched: Set<number>, barrierCells: Set<number>, cellHistory: Set<number>[], cells: string[], cellComponents: (ValueComponent | undefined)[], lane: boolean, fallbacks: Set<number>, list: BlockDeclarations, features: ReadonlySet<string>): {
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