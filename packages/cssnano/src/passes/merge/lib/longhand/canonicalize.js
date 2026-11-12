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
/** @import {RunContext} from '../../../ir/runContext.js' */
import { discardOverriddenDeclarations } from './decl/overriddenDeclarations.js';
import { decodedPropertyName, isAll } from './decl/importanceLanes.js';
import {
  foldableShorthands,
  foldContainerDeclarations,
  foldShorthandDeclaration,
} from './minifyShorthand.js';
import { RUN_END } from './blockDeclarations.js';
import { declarationsFromRecords } from './recordDeclarations.js';
import { firstDeclaration } from '../rules/blockChildren.js';
import { commitDeclarations } from '../rules/arenaEdits.js';
import { AT_RULE_BLOCK, RULE } from '../rules/blockRecord.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {BlockDeclarations} from './blockDeclarations.js'; */
/** @import {BlockRecords} from '../rules/blockRecords.js'; */
/** @import {ArenaIndex} from '../rules/blockRecord.js'; */

/**
 * A block of a round: its list, and the arena index of the block or rule the
 * list was read from.
 *
 * @typedef {{container: ArenaIndex, list: BlockDeclarations}} Block
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
 *   columnRules: {block: Block, positions: number[], lanes: [number[], number[]]}[],
 *   setsOtherColumn: boolean,
 *   placeShorthands: boolean,
 *   boxSupport: BoxSupport,
 *   pairShorthands: ReadonlySet<string>,
 *   features: ReadonlySet<string>,
 *   run: RunContext,
 *   records: BlockRecords
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
 * Writes a block's list back to its records.
 *
 * @param {Block} block
 * @param {MergeContext} context
 * @return {void}
 */
function commitBlock(block, context) {
  commitDeclarations(context.records, context.run, block.container, block.list);
}

/**
 * Classifies declarations within a block, runs reducers, and tracks column candidates.
 * @param {Block} block
 * @param {boolean} styleRule whether the block is a style rule
 * @param {MergeContext} context
 * @return {void}
 */
function processContainer(block, styleRule, context) {
  const { list } = block;
  // Before classification, so the family reducers never see removed items.
  // Style rules only: at-rule descriptors follow their own validity rules.
  if (styleRule) {
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
    commitBlock(block, context);
  }
}

/**
 * @param {boolean} placeShorthands
 * @param {BoxSupport} boxSupport
 * @param {ReadonlySet<string>} pairShorthands
 * @param {RunContext} run the run whose tables and features the rounds read
 * @param {BlockRecords} records the records the round reads and edits
 * @return {MergeContext} the state that the rounds of one run share
 */
export function longhandContext(
  placeShorthands,
  boxSupport,
  pairShorthands,
  run,
  records
) {
  return {
    columnRules: [],
    setsOtherColumn: false,
    placeShorthands,
    boxSupport,
    pairShorthands,
    features: run.features,
    run,
    records,
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
function finishColumns(context) {
  if (!context.setsOtherColumn) {
    for (const { block, positions, lanes } of context.columnRules) {
      reduceColumns(block.list, positions, lanes, context.features);
    }
  }
  const blocks = new Set(context.columnRules.map((rule) => rule.block));
  for (const block of blocks) commitBlock(block, context);
}

/**
 * Canonicalizes the blocks a record chain holds, in document order: each rule
 * and at-rule block that holds a declaration, then the blocks it nests.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index the block whose chain is walked
 * @param {MergeContext} context
 * @return {void}
 */
function canonicalizeChildren(records, index, context) {
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const record = records.entry(entry);
    if (record.kind !== RULE && record.kind !== AT_RULE_BLOCK) continue;
    if (firstDeclaration(records, entry) !== undefined) {
      processContainer(
        {
          container: entry,
          list: declarationsFromRecords(records, context.run, entry),
        },
        record.kind === RULE,
        context
      );
    }
    canonicalizeChildren(records, entry, context);
  }
}

/**
 * The longhand round on the records: the root's own declarations are folded,
 * then every block that holds a declaration, then the columns are finished.
 *
 * @param {BlockRecords} records
 * @param {MergeContext} context a context made with the records
 * @return {void}
 */
export function canonicalizeRecords(records, context) {
  const root = /** @type {ArenaIndex} */ (records.root.index);
  const list = declarationsFromRecords(records, context.run, root);
  foldContainerDeclarations(list, list.chain);
  commitBlock({ container: root, list }, context);
  canonicalizeChildren(records, root, context);
  finishColumns(context);
}
