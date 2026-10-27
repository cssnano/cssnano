import cssnanoUtils from '#utils';
import { withoutVendorPrefix } from './vendorPrefix.js';
import {
  allColumnProps,
  reduceColumns,
  setsOtherColumnProperty,
} from './decl/columns.js';
import { addBoxDeclaration, reduceBox } from './decl/boxReducer.js';
import { aliasedGroup, boxProperties } from './decl/boxGroups.js';
import { reduceBorder } from './decl/borderReducer.js';
import { reduceBorderRadius } from './decl/borderRadiusReducer.js';
import {
  allPhysicalBorderProperties,
  allRadiusProperties,
} from './decl/borderData.js';
import { alignmentProperties } from './decl/alignmentForms.js';
import { reduceAlignmentFamily } from './decl/alignmentReducer.js';
import { pairFamilyOf } from './decl/pairForms.js';
import { reducePairFamily } from './decl/pairReducer.js';
/** @import {BoxSupport} from './targetSupport.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
import { endsDeclarationRun } from './decl/declarationRuns.js';
import { applyChildEdits } from '../deferredChildEdits.js';
import { discardOverriddenDeclarations } from './decl/overriddenDeclarations.js';
import { decodedPropertyName, isAll } from './decl/importanceLanes.js';
import {
  foldableShorthands,
  foldContainerDeclarations,
  foldShorthandDeclaration,
} from './minifyShorthand.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {Container, Declaration} from 'postcss'; */
/** @import {BoxDeclarations} from './decl/boxReducer.js'; */
/** @import {BoxGroup} from './decl/boxGroups.js'; */

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
 *   columnRules: [Container, Declaration[], [Declaration[], Declaration[]]][],
 *   setsOtherColumn: boolean,
 *   shorthandMemoTable: Map<string, string | null>,
 *   familyRecords: Map<string, FamilyRecord>,
 *   placeShorthands: boolean,
 *   boxSupport: BoxSupport,
 *   pairShorthands: ReadonlySet<string>,
 *   textTable: TextTable
 * }} MergeContext
 */

/**
 * Which families a lowercased property name belongs to, resolved once per run
 * by the same lookups the classifier used per declaration.
 *
 * @typedef {{
 *   pair: PairFamily | undefined,
 *   boxProperty: ReturnType<typeof boxProperties.get>,
 *   boxGroup: BoxGroup | undefined,
 *   alignment: AlignmentFamilyConfig | undefined,
 * }} FamilyRecord
 */

/**
 * @typedef {{
 *   family: PairFamily | AlignmentFamilyConfig,
 *   decls: Declaration[],
 *   lanes: [Declaration[], Declaration[]]
 * }} FamilyDeclarations
 */

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
function reduceClassifiedContainer(container, state, context) {
  if (state.boxes) {
    for (const box of state.boxes.values()) {
      reduceBox(container, box, context.boxSupport, context.textTable);
    }
  }
  if (state.borderRadiusDecls.length) {
    reduceBorderRadius(
      container,
      state.borderRadiusDecls,
      state.borderRadiusLanes
    );
  }
  if (state.borderDeclarations.length) {
    reduceBorder(container, state.borderDeclarations, state.hasForeignBorder);
  }
  if (state.families) {
    for (const { family, decls, lanes } of state.families.values()) {
      if ('longhands' in family) {
        reducePairFamily(container, family, decls, lanes);
      } else {
        reduceAlignmentFamily(container, family, decls, lanes);
      }
    }
  }
  if (state.columnDecls.length) {
    context.columnRules.push([container, state.columnDecls, state.columnLanes]);
  }
}

/**
 * Adds a declaration to its shorthand family, creating the family on first use.
 *
 * @param {Parameters<typeof reduceClassifiedContainer>[1]} state
 * @param {FamilyDeclarations['family']} family
 * @param {Declaration} child
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
 * The family record of a property name, resolved on first use in the run.
 *
 * @param {string} prop - lowercased property name
 * @param {Omit<MergeContext, 'columnRules'>} context
 * @return {FamilyRecord}
 */
function familyRecordOf(prop, context) {
  const known = context.familyRecords.get(prop);
  if (known) return known;
  const boxProperty = boxProperties.get(prop);
  const record = {
    pair: pairFamilyOf(prop),
    boxProperty,
    boxGroup: boxProperty?.family.group ?? aliasedGroup(prop),
    alignment: alignmentFamilyOf(prop),
  };
  context.familyRecords.set(prop, record);
  return record;
}

/**
 * Classifies a single declaration into the container accumulation state.
 *
 * @param {Declaration} child
 * @param {string} prop
 * @param {number} laneIndex
 * @param {Parameters<typeof reduceClassifiedContainer>[1]} state
 * @param {Omit<MergeContext, 'columnRules'>} context
 * @return {void}
 */
function classifyDeclaration(child, prop, laneIndex, state, context) {
  const record = familyRecordOf(prop, context);
  // Families the targets cannot parse are not collected, so they stay as written.
  const { pair } = record;
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
      foldShorthandDeclaration(
        child,
        context.shorthandMemoTable,
        prop,
        context.textTable
      );
    } else {
      state.hasForeignBorder = true;
    }
    return;
  }
  if (prop.startsWith('column')) {
    context.setsOtherColumn ||= setsOtherColumnProperty(child);
    if (allColumnProps.has(prop)) {
      state.columnDecls.push(child);
      state.columnLanes[laneIndex].push(child);
    }
    return;
  }
  const { boxProperty, boxGroup } = record;
  if (boxGroup) {
    addBoxDeclaration(state, child, boxProperty, boxGroup, laneIndex);
    foldShorthandDeclaration(
      child,
      context.shorthandMemoTable,
      prop,
      context.textTable
    );
    return;
  }
  // Only when every target supports place-* may one be synthesized.
  const alignmentFamily = context.placeShorthands
    ? record.alignment
    : undefined;
  foldShorthandDeclaration(
    child,
    context.shorthandMemoTable,
    prop,
    context.textTable
  );
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
 * @param {MergeContext} context
 * @return {void}
 */
function processContainer(container, context) {
  if (!container.nodes) return;
  // Before classification, so the family reducers never see detached nodes.
  // Style rules only: at-rule descriptors follow their own validity rules.
  if (container.type === 'rule') {
    discardOverriddenDeclarations(container);
    applyChildEdits(container);
  }

  // Reducers remove nodes, so reduce only after the loop has read them all.
  const runs = [];
  let state = createContainerState();
  for (const child of container.nodes) {
    // Declarations after a nested rule cascade after its declarations, so a
    // shorthand merged across it would override them.
    if (endsDeclarationRun(child)) {
      runs.push(state);
      state = createContainerState();
      continue;
    }
    if (child.type !== 'decl') continue;
    const laneIndex = child.important ? 1 : 0;
    if (isAll(child)) {
      state.hasForeignBorder = true;
      if (state.boxes) {
        for (const box of state.boxes.values())
          box.lanes[laneIndex].push(child);
      }
      state.borderRadiusLanes[laneIndex].push(child);
      state.columnLanes[laneIndex].push(child);
      for (const family of state.families?.values() ?? []) {
        family.lanes[laneIndex].push(child);
      }
      continue;
    }

    classifyDeclaration(
      child,
      asciiLowerCase(child.prop),
      laneIndex,
      state,
      context
    );
  }

  runs.push(state);
  for (const run of runs) reduceClassifiedContainer(container, run, context);
  applyChildEdits(container);
}

/**
 * @param {boolean} placeShorthands
 * @param {BoxSupport} boxSupport
 * @param {ReadonlySet<string>} pairShorthands
 * @param {TextTable} textTable the tokens the walk left for the declarations
 * @return {MergeContext} the state that the rounds of one run share
 */
export function longhandContext(
  placeShorthands,
  boxSupport,
  pairShorthands,
  textTable
) {
  return {
    columnRules: [],
    setsOtherColumn: false,
    shorthandMemoTable: new Map(),
    familyRecords: new Map(),
    placeShorthands,
    boxSupport,
    pairShorthands,
    textTable,
  };
}

/**
 * Reduces the column rules once every block of the stylesheet is canonicalized,
 * since whether a column property is set elsewhere is a whole-stylesheet fact.
 *
 * @param {MergeContext} context
 * @return {void}
 */
export function finishColumns(context) {
  if (!context.setsOtherColumn) {
    for (const [rule, decls, lanes] of context.columnRules) {
      reduceColumns(rule, decls, lanes);
    }
    // A rule may hold several runs; rebuild it once, after all of them.
    for (const [rule] of context.columnRules) applyChildEdits(rule);
  }
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
    foldContainerDeclarations(
      block,
      context.shorthandMemoTable,
      context.textTable
    );
    return;
  }
  processContainer(block, context);
}
