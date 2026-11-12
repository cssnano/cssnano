import cssnanoUtils from '#utils';
import { withoutVendorPrefix } from './vendorPrefix.js';
import {
  allColumnProps,
  reduceColumns,
  setsOtherColumnProperty,
} from './decl/columns.js';
import { addBoxDeclaration } from './decl/boxReducer.js';
import { aliasedGroup, boxProperties } from './decl/boxGroups.js';
import {
  allPhysicalBorderProperties,
  allRadiusProperties,
} from './decl/borderData.js';
import { alignmentProperties } from './decl/alignmentForms.js';
import { pairFamilyOf } from './decl/pairForms.js';
import { reduceClassifiedContainer } from './classifiedReducers.js';
/** @import {BoxSupport} from './targetSupport.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {RunContext} from '../../../ir/runContext.js' */
/** @import {TokenLists} from '../../../ir/tokenLists.js' */
/** @import {ValueIds} from '../../../ir/valueIds.js' */
import { discardOverriddenDeclarations } from './decl/overriddenDeclarations.js';
import { decodedPropertyName, isAll } from './decl/importanceLanes.js';
import {
  foldableShorthands,
  foldContainerDeclarations,
  foldShorthandDeclaration,
} from './minifyShorthand.js';
import { RUN_END } from './blockDeclarations.js';
import { commitToNodes, declarationsFromNodes } from './nodeDeclarations.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {Container} from 'postcss'; */
/** @import {NodeBlock} from './nodeDeclarations.js'; */
/** @import {BlockDeclarations} from './blockDeclarations.js'; */

/**
 * @typedef {object} Options
 */

/**
 * Prefixed aliases such as -webkit-justify-content and escaped spellings
 * share the cascade with the property they name, so the alignment reducer
 * must see them. It cannot parse an alias, so any alias leaves the whole
 * family unmerged in that run, which keeps the cascade intact.
 *
 * @param {string} prop - lowercased property name
 * @return {import('./decl/alignmentForms.js').AlignmentFamilyConfig | undefined}
 */
function alignmentFamilyOf(prop) {
  const escaped = prop.includes('\\');
  if (!escaped && !prop.startsWith('-')) return alignmentProperties.get(prop);
  if (prop.startsWith('--')) return undefined;
  const name = escaped ? decodedPropertyName(prop) : prop;
  return name === undefined
    ? undefined
    : alignmentProperties.get(withoutVendorPrefix(name));
}

/** @import {PairFamily} from './decl/pairForms.js'; */
/** @import {AlignmentFamilyConfig} from './decl/alignmentForms.js'; */

/**
 * @typedef {{
 *   columnRules: {block: NodeBlock, positions: number[], lanes: [number[], number[]]}[],
 *   setsOtherColumn: boolean,
 *   placeShorthands: boolean,
 *   boxSupport: BoxSupport,
 *   pairShorthands: ReadonlySet<string>,
 *   features: ReadonlySet<string>,
 *   textTable: TextTable,
 *   tokenLists: TokenLists,
 *   valueIds: ValueIds
 * }} MergeContext
 */

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
function addFamilyDeclaration(state, family, child, laneIndex) {
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
 * Classifies a single declaration into the container accumulation state.
 *
 * @param {BlockDeclarations} list
 * @param {number} child - the position of the declaration in `list`
 * @param {string} prop
 * @param {number} laneIndex
 * @param {Parameters<typeof reduceClassifiedContainer>[1]} state
 * @param {Omit<MergeContext, 'columnRules'>} context
 * @return {void}
 */
function classifyDeclaration(list, child, prop, laneIndex, state, context) {
  // Families the targets cannot parse are not collected, so they stay as written.
  const pair = pairFamilyOf(prop);
  if (pair && context.pairShorthands.has(pair.shorthand)) {
    addFamilyDeclaration(state, pair, child, laneIndex);
  }
  if (prop.startsWith('border')) {
    if (allRadiusProperties.has(prop)) {
      state.borderRadiusDecls.push(child);
      state.borderRadiusLanes[laneIndex].push(child);
    } else if (allPhysicalBorderProperties.has(prop)) {
      state.borderDeclarations.push(child);
    } else if (foldableShorthands.has(prop)) {
      foldShorthandDeclaration(list, child, prop);
    } else {
      state.hasForeignBorder = true;
    }
    return;
  }
  if (prop.startsWith('column')) {
    context.setsOtherColumn ||= setsOtherColumnProperty(list.at(child));
    if (allColumnProps.has(prop)) {
      state.columnDecls.push(child);
      state.columnLanes[laneIndex].push(child);
    }
    return;
  }
  const boxProperty = boxProperties.get(prop);
  const boxGroup = boxProperty?.family.group ?? aliasedGroup(prop);
  if (boxGroup) {
    addBoxDeclaration(state, child, boxProperty, boxGroup, laneIndex);
    foldShorthandDeclaration(list, child, prop);
    return;
  }
  // Only when every target supports place-* may one be synthesized.
  const alignmentFamily = context.placeShorthands
    ? alignmentFamilyOf(prop)
    : undefined;
  foldShorthandDeclaration(list, child, prop);
  if (alignmentFamily) {
    addFamilyDeclaration(state, alignmentFamily, child, laneIndex);
  }
}

/**
 * @return {Parameters<typeof reduceClassifiedContainer>[1]}
 */
function createContainerState() {
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

/**
 * Classifies declarations within a container, runs reducers, and tracks column candidates.
 * @param {Container} container
 * @param {NodeBlock} block
 * @param {MergeContext} context
 * @return {void}
 */
function processContainer(container, block, context) {
  const { list } = block;
  // Before classification, so the family reducers never see removed items.
  // Style rules only: at-rule descriptors follow their own validity rules.
  if (container.type === 'rule') {
    discardOverriddenDeclarations(list, context.features);
  }

  // Reducers remove items, so reduce only after the loop has read them all.
  const runs = [];
  let state = createContainerState();
  for (const entry of list.chain) {
    // Declarations after a nested rule cascade after its declarations, so a
    // shorthand merged across it would override them. A value kept as written
    // bounds the run the same way.
    if (entry === RUN_END || list.at(entry).kept) {
      runs.push(state);
      state = createContainerState();
      continue;
    }
    const child = list.at(entry);
    if (child.removed) continue;
    const laneIndex = child.important ? 1 : 0;
    if (isAll(child)) {
      state.hasForeignBorder = true;
      if (state.boxes) {
        for (const box of state.boxes.values())
          box.lanes[laneIndex].push(entry);
      }
      state.borderRadiusLanes[laneIndex].push(entry);
      state.columnLanes[laneIndex].push(entry);
      for (const family of state.families?.values() ?? []) {
        family.lanes[laneIndex].push(entry);
      }
      continue;
    }

    classifyDeclaration(
      list,
      entry,
      asciiLowerCase(child.prop),
      laneIndex,
      state,
      context
    );
  }

  runs.push(state);
  for (const run of runs) reduceClassifiedContainer(block, run, context);
  // A column rule waits for `finishColumns`, which commits its block once.
  if (!runs.some((run) => run.columnDecls.length > 0)) {
    commitToNodes(block, context.textTable);
  }
}

/**
 * @param {boolean} placeShorthands
 * @param {BoxSupport} boxSupport
 * @param {ReadonlySet<string>} pairShorthands
 * @param {RunContext} run the run whose tables and features the rounds read
 * @return {MergeContext} the state that the rounds of one run share
 */
export function longhandContext(
  placeShorthands,
  boxSupport,
  pairShorthands,
  run
) {
  return {
    columnRules: [],
    setsOtherColumn: false,
    placeShorthands,
    boxSupport,
    pairShorthands,
    features: run.features,
    textTable: run.textTable,
    tokenLists: run.tokenLists,
    valueIds: run.valueIds,
  };
}

/**
 * Reduces the column rules once every block of the stylesheet is canonicalized,
 * since whether a column property is set elsewhere is a whole-stylesheet fact.
 * Each column block is committed once, after its column reducers.
 *
 * @param {MergeContext} context
 * @return {void}
 */
export function finishColumns(context) {
  if (!context.setsOtherColumn) {
    for (const { block, positions, lanes } of context.columnRules) {
      reduceColumns(block.list, positions, lanes, context.features);
    }
  }
  const blocks = new Set(context.columnRules.map((rule) => rule.block));
  for (const block of blocks) commitToNodes(block, context.textTable);
}

/**
 * The longhand reducers on one block. The root only folds its own shorthands,
 * since its declarations have no rule to reduce them in. Column rules wait for
 * `finishColumns`, which needs the whole stylesheet.
 *
 * @param {Container} block
 * @param {MergeContext} context
 * @return {void}
 */
export function canonicalize(block, context) {
  if (block.type === 'root') {
    const root = declarationsFromNodes(block, context);
    foldContainerDeclarations(root.list, root.list.chain);
    commitToNodes(root, context.textTable);
    return;
  }
  if (!block.nodes) return;
  processContainer(block, declarationsFromNodes(block, context), context);
}
