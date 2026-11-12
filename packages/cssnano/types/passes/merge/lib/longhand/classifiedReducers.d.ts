import type { BoxDeclarations } from './decl/boxReducer.js';
import type { BoxGroup } from './decl/boxGroups.js';
import type { FamilyDeclarations, MergeContext } from './canonicalize.js';
import type { NodeBlock } from './nodeDeclarations.js';
/** @import {BoxDeclarations} from './decl/boxReducer.js'; */
/** @import {BoxGroup} from './decl/boxGroups.js'; */
/** @import {FamilyDeclarations, MergeContext} from './canonicalize.js'; */
/** @import {NodeBlock} from './nodeDeclarations.js'; */
/**
 * Runs property-family reducers on classified declarations for a block. The
 * declarations are positions in the block's list.
 * @param {NodeBlock} block
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
 * @param {MergeContext} context
 * @return {void}
 */
export declare function reduceClassifiedContainer(block: NodeBlock, state: {
    boxes: Map<BoxGroup, BoxDeclarations> | null;
    borderRadiusDecls: number[];
    borderRadiusLanes: [number[], number[]];
    columnDecls: number[];
    columnLanes: [number[], number[]];
    borderDeclarations: number[];
    hasForeignBorder: boolean;
    families: Map<FamilyDeclarations['family'], FamilyDeclarations> | null;
}, context: MergeContext): void;
//# sourceMappingURL=classifiedReducers.d.ts.map