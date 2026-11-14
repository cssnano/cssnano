/** @import {PairFamily} from './decl/pairForms.js'; */
/** @import {AlignmentFamilyConfig} from './decl/alignmentForms.js'; */
import { reduceBox } from './decl/boxReducer.js';
import { reduceBorder } from './decl/borderReducer.js';
import { reduceBorderRadius } from './decl/borderRadiusReducer.js';
import { reduceAlignmentFamily } from './decl/alignmentReducer.js';
import { reducePairFamily } from './decl/pairReducer.js';
import { reduceColumns } from './decl/columns.js';

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
    if (!context.secondRound) {
      context.columnRules.push({
        block,
        positions: state.columnDecls,
        lanes: state.columnLanes,
      });
    } else if (!context.setsOtherColumn) {
      reduceColumns(
        list,
        state.columnDecls,
        state.columnLanes,
        context.features
      );
    }
  }
}

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
export function addFamilyDeclaration(state, family, child, laneIndex) {
  state.families ??= new Map();
  let entry = state.families.get(family);
  if (!entry) {
    entry = { family, decls: [], lanes: [[], []] };
    state.families.set(family, entry);
  }
  entry.decls.push(child);
  entry.lanes[laneIndex].push(child);
}

/**
 * @return {Parameters<typeof reduceClassifiedContainer>[1]}
 */
export function createContainerState() {
  return {
    boxes: null,
    borderRadiusDecls: [],
    borderRadiusLanes: [[], []],
    columnDecls: [],
    columnLanes: [[], []],
    borderDeclarations: [],
    hasForeignBorder: false,
    families: null,
  };
}
