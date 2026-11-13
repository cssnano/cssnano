import type { BoxDeclarations } from './decl/boxReducer.js';
import type { BoxGroup } from './decl/boxGroups.js';
import type { FamilyDeclarations, LonghandRound } from './canonicalize.js';
import type { Block } from './canonicalize.js';
/** @import {BoxDeclarations} from './decl/boxReducer.js'; */
/** @import {BoxGroup} from './decl/boxGroups.js'; */
/** @import {FamilyDeclarations, LonghandRound} from './canonicalize.js'; */
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
//# sourceMappingURL=classifiedReducers.d.ts.map