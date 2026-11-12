import { reduceBox } from './decl/boxReducer.js';
import { reduceBorder } from './decl/borderReducer.js';
import { reduceBorderRadius } from './decl/borderRadiusReducer.js';
import { reduceAlignmentFamily } from './decl/alignmentReducer.js';
import { reducePairFamily } from './decl/pairReducer.js';

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
export function reduceClassifiedContainer(block, state, context) {
  const { list } = block;
  if (state.boxes) {
    for (const box of state.boxes.values()) {
      reduceBox(list, box, context.boxSupport, context.features);
    }
  }
  if (state.borderRadiusDecls.length) {
    reduceBorderRadius(
      list,
      state.borderRadiusDecls,
      state.borderRadiusLanes,
      context.features
    );
  }
  if (state.borderDeclarations.length) {
    reduceBorder(
      list,
      state.borderDeclarations,
      state.hasForeignBorder,
      context.features
    );
  }
  if (state.families) {
    for (const { family, decls, lanes } of state.families.values()) {
      if ('longhands' in family) {
        reducePairFamily(list, family, decls, lanes, context.features);
      } else {
        reduceAlignmentFamily(list, family, decls, lanes);
      }
    }
  }
  if (state.columnDecls.length) {
    context.columnRules.push({
      block,
      positions: state.columnDecls,
      lanes: state.columnLanes,
    });
  }
}
