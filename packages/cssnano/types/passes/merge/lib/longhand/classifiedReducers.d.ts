import type { PairFamily } from './decl/pairForms.js';
import type { AlignmentFamilyConfig } from './decl/alignmentForms.js';
import type { BoxDeclarations } from './decl/boxReducer.js';
import type { BoxGroup } from './decl/boxGroups.js';
import type { LonghandRound } from './canonicalize.js';
import type { Block } from './canonicalize.js';
/** @import {BoxDeclarations} from './decl/boxReducer.js'; */
/** @import {BoxGroup} from './decl/boxGroups.js'; */
/** @import {LonghandRound} from './canonicalize.js'; */
/** @import {Block} from './canonicalize.js'; */
/**
 * Runs property-family reducers on classified declarations for a block. The
 * declarations are positions in the block's list.
 * @param {Block} block
 * @param {{
 *   boxes: Map<BoxGroup, BoxDeclarations> | null,
 *   borderRadiusDecls: number[],
 *   borderRadiusLanes: [number[], number[]],
 *   columnDecls: number[],
 *   columnLanes: [number[], number[]],
 *   borderDeclarations: number[],
 *   hasForeignBorder: boolean,
 *   families: Map<FamilyDeclarations['family'], FamilyDeclarations> | null,
 * }} state
 * @param {LonghandRound} context
 * @return {void}
 */
export declare function reduceClassifiedContainer(block: Block, state: {
    boxes: Map<BoxGroup, BoxDeclarations> | null;
    borderRadiusDecls: number[];
    borderRadiusLanes: [number[], number[]];
    columnDecls: number[];
    columnLanes: [number[], number[]];
    borderDeclarations: number[];
    hasForeignBorder: boolean;
    families: Map<FamilyDeclarations['family'], FamilyDeclarations> | null;
}, context: LonghandRound): void;
export type FamilyDeclarations = {
    family: PairFamily | AlignmentFamilyConfig;
    decls: number[];
    lanes: [number[], number[]];
};
/**
 * @typedef {{
 *   family: PairFamily | AlignmentFamilyConfig,
 *   decls: number[],
 *   lanes: [number[], number[]]
 * }} FamilyDeclarations
 */
/**
 * Adds a declaration to its shorthand family, creating the family on first use.
 *
 * @param {Parameters<typeof reduceClassifiedContainer>[1]} state
 * @param {FamilyDeclarations['family']} family
 * @param {number} child
 * @param {number} laneIndex
 * @return {void}
 */
export declare function addFamilyDeclaration(state: Parameters<typeof reduceClassifiedContainer>[1], family: FamilyDeclarations['family'], child: number, laneIndex: number): void;
/**
 * @return {Parameters<typeof reduceClassifiedContainer>[1]}
 */
export declare function createContainerState(): Parameters<typeof reduceClassifiedContainer>[1];
//# sourceMappingURL=classifiedReducers.d.ts.map