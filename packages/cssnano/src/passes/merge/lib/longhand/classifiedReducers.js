import { reduceBox } from './decl/boxReducer.js';
import { reduceBorder } from './decl/borderReducer.js';
import { reduceBorderRadius } from './decl/borderRadiusReducer.js';
import { reduceAlignmentFamily } from './decl/alignmentReducer.js';
import { reducePairFamily } from './decl/pairReducer.js';

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
export function reduceClassifiedContainer(container, state, context) {
  if (state.boxes) {
    for (const box of state.boxes.values()) {
      reduceBox(
        container,
        box,
        context.boxSupport,
        context.textTable,
        context.features
      );
    }
  }
  if (state.borderRadiusDecls.length) {
    reduceBorderRadius(
      container,
      state.borderRadiusDecls,
      state.borderRadiusLanes,
      context.textTable,
      context.features
    );
  }
  if (state.borderDeclarations.length) {
    reduceBorder(
      container,
      state.borderDeclarations,
      state.hasForeignBorder,
      context.textTable,
      context.features
    );
  }
  if (state.families) {
    for (const { family, decls, lanes } of state.families.values()) {
      if ('longhands' in family) {
        reducePairFamily(
          container,
          family,
          decls,
          lanes,
          context.textTable,
          context.features
        );
      } else {
        reduceAlignmentFamily(
          container,
          family,
          decls,
          lanes,
          context.textTable
        );
      }
    }
  }
  if (state.columnDecls.length) {
    context.columnRules.push([container, state.columnDecls, state.columnLanes]);
  }
}
