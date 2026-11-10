import type { BoxDeclarations } from './decl/boxReducer.js';
import type { BoxGroup } from './decl/boxGroups.js';
import type { FamilyDeclarations, MergeContext } from './canonicalize.js';
import type { Container, Declaration } from 'postcss';
/** @import {BoxDeclarations} from './decl/boxReducer.js'; */
/** @import {BoxGroup} from './decl/boxGroups.js'; */
/** @import {FamilyDeclarations, MergeContext} from './canonicalize.js'; */
/** @import {Container, Declaration} from 'postcss'; */
/**
 * Runs property-family reducers on classified declarations for a container.
 * @param {Container} container
 * @param {{
 *   boxes: Map<BoxGroup, BoxDeclarations> | null,
 *   borderRadiusDecls: Declaration[],
 *   borderRadiusLanes: [Declaration[], Declaration[]],
 *   columnDecls: Declaration[],
 *   columnLanes: [Declaration[], Declaration[]],
 *   borderDeclarations: Declaration[],
 *   hasForeignBorder: boolean,
 *   families: Map<FamilyDeclarations['family'], FamilyDeclarations> | null,
 * }} state
 * @param {MergeContext} context
 * @return {void}
 */
export declare function reduceClassifiedContainer(container: Container, state: {
    boxes: Map<BoxGroup, BoxDeclarations> | null;
    borderRadiusDecls: Declaration[];
    borderRadiusLanes: [Declaration[], Declaration[]];
    columnDecls: Declaration[];
    columnLanes: [Declaration[], Declaration[]];
    borderDeclarations: Declaration[];
    hasForeignBorder: boolean;
    families: Map<FamilyDeclarations['family'], FamilyDeclarations> | null;
}, context: MergeContext): void;
//# sourceMappingURL=classifiedReducers.d.ts.map