import cssnanoUtils from '#utils';
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
import { alignmentFamilyOf } from './decl/alignmentForms.js';
import { pairFamiliesOf } from './decl/pairForms.js';
import {
  addFamilyDeclaration,
  createContainerState,
  reduceClassifiedContainer,
} from './classifiedReducers.js';
/** @import {BoxSupport} from './targetSupport.js' */
/** @import {RunContext} from '../../../ir/runContext.js' */
import { discardOverriddenDeclarations } from './decl/overriddenDeclarations.js';
import { isAll } from './decl/importanceLanes.js';
import {
  foldableShorthands,
  foldContainerDeclarations,
  foldShorthandDeclaration,
} from './minifyShorthand.js';
import { RUN_END } from './blockDeclarations.js';
import { declarationsFromRecords } from './recordDeclarations.js';
import { firstDeclaration } from '../../../ir/blockChildren.js';
import { commitDeclarations } from '../../../ir/arenaEdits.js';
import { AT_RULE_BLOCK, RULE } from '../../../ir/blockRecord.js';
import { isReached } from '../../../ir/linkChecks.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {BlockDeclarations} from './blockDeclarations.js'; */
/** @import {BlockRecords} from '../../../ir/blockRecords.js'; */
/** @import {ArenaIndex} from '../../../ir/blockRecord.js'; */

/**
 * A block of a round: its list, and the arena index of the block or rule the
 * list was read from.
 *
 * @typedef {{container: ArenaIndex, list: BlockDeclarations}} Block
 */

/**
 * Classifies a single declaration into the container accumulation state.
 *
 * @param {BlockDeclarations} list
 * @param {number} child - the position of the declaration in `list`
 * @param {string} prop
 * @param {number} laneIndex
 * @param {Parameters<typeof reduceClassifiedContainer>[1]} state
 * @param {LonghandRound} context
 * @param {ArenaIndex} container the block that holds the declaration
 * @return {void}
 */
function classifyDeclaration(
  list,
  child,
  prop,
  laneIndex,
  state,
  context,
  container
) {
  // Families the targets cannot parse are not collected, so they stay as written.
  for (const pair of pairFamiliesOf(prop)) {
    if (context.pairShorthands.has(pair.shorthand)) {
      addFamilyDeclaration(state, pair, child, laneIndex);
    }
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
    // A block is recorded once, so the check is skipped after its first hit.
    if (
      !context.secondRound &&
      context.otherColumnBlocks.at(-1) !== container &&
      setsOtherColumnProperty(list.at(child))
    ) {
      context.otherColumnBlocks.push(container);
    }
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
 * Writes a block's list back to its records.
 *
 * @param {BlockRecords} records
 * @param {Block} block
 * @param {LonghandRound} context
 * @return {void}
 */
function commitBlock(records, block, context) {
  commitDeclarations(records, context.run, block.container, block.list);
}

/**
 * Classifies declarations within a block, runs reducers, and tracks column candidates.
 * @param {BlockRecords} records
 * @param {Block} block
 * @param {boolean} styleRule whether the block is a style rule
 * @param {LonghandRound} context
 * @return {void}
 */
function processContainer(records, block, styleRule, context) {
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
      context,
      block.container
    );
  }

  runs.push(state);
  for (const run of runs) reduceClassifiedContainer(block, run, context);
  // A first-round column rule waits for `finishColumns`, which commits its block once.
  if (context.secondRound || !runs.some((run) => run.columnDecls.length > 0)) {
    commitBlock(records, block, context);
  }
}

/**
 * The longhand round of one run: the column rules and column blocks the
 * rounds gather, and the targets' tables. `finishColumns` clears the gathered
 * state, so one round can serve each pass over the blocks.
 */
export class LonghandRound {
  /** @type {{block: Block, positions: number[], lanes: [number[], number[]]}[]} */
  columnRules = [];

  /**
   * The blocks that set a column property other than column-width and
   * column-count, each once, in the order the round reached them.
   * @type {ArenaIndex[]}
   */
  otherColumnBlocks = [];

  /** Whether the last `finishColumns` found such a block. */
  setsOtherColumn = false;

  /**
   * Whether this is the second round of its run. It gathers no column rule
   * and no fact; it reduces a block's columns as it reaches them, using the
   * first round's `setsOtherColumn`.
   * @type {boolean}
   */
  secondRound = false;

  /**
   * @param {boolean} placeShorthands
   * @param {BoxSupport} boxSupport
   * @param {ReadonlySet<string>} pairShorthands
   * @param {RunContext} run the run whose tables and features the rounds read
   */
  constructor(placeShorthands, boxSupport, pairShorthands, run) {
    this.placeShorthands = placeShorthands;
    this.boxSupport = boxSupport;
    this.pairShorthands = pairShorthands;
    this.features = run.features;
    this.run = run;
  }

  /**
   * Folds and commits the root's own declarations.
   * @param {BlockRecords} records
   * @return {void}
   */
  root(records) {
    const root = /** @type {ArenaIndex} */ (records.root.index);
    const list = declarationsFromRecords(records, this.run, root);
    foldContainerDeclarations(list, list.chain);
    commitBlock(records, { container: root, list }, this);
  }

  /**
   * Reduces a rule or at-rule block that holds a declaration; other entries are left alone.
   * @param {BlockRecords} records
   * @param {ArenaIndex} index the entry the round reaches
   * @return {void}
   */
  block(records, index) {
    const record = records.entry(index);
    if (record.kind !== RULE && record.kind !== AT_RULE_BLOCK) return;
    if (firstDeclaration(records, index) === undefined) return;
    processContainer(
      records,
      {
        container: index,
        list: declarationsFromRecords(records, this.run, index),
      },
      record.kind === RULE,
      this
    );
  }

  /**
   * The second round of this run. It shares these tables, and the first
   * round's column fact, which `finishColumns` has set. Call it after
   * `finishColumns`.
   * @return {LonghandRound}
   */
  second() {
    const round = new LonghandRound(
      this.placeShorthands,
      this.boxSupport,
      this.pairShorthands,
      this.run
    );
    round.secondRound = true;
    round.setsOtherColumn = this.setsOtherColumn;
    return round;
  }

  /**
   * Reduces the column rules once every block is canonicalized, since a column
   * property set elsewhere is a whole-stylesheet fact; commits each column block once.
   * @param {BlockRecords} records
   * @return {void}
   */
  finishColumns(records) {
    // A block that the root no longer reaches, such as one an overridden at-rule removed, sets no fact.
    this.otherColumnBlocks = this.otherColumnBlocks.filter((index) =>
      isReached(records, index)
    );
    this.columnRules = this.columnRules.filter(({ block }) =>
      isReached(records, block.container)
    );
    this.setsOtherColumn = this.otherColumnBlocks.length > 0;
    if (!this.setsOtherColumn) {
      for (const { block, positions, lanes } of this.columnRules) {
        reduceColumns(block.list, positions, lanes, this.features);
      }
    }
    const blocks = new Set(this.columnRules.map((rule) => rule.block));
    for (const block of blocks) commitBlock(records, block, this);
    // The next round gathers its column facts afresh.
    this.columnRules = [];
    this.otherColumnBlocks = [];
  }
}

/**
 * @param {boolean} placeShorthands
 * @param {BoxSupport} boxSupport
 * @param {ReadonlySet<string>} pairShorthands
 * @param {RunContext} run the run whose tables and features the rounds read
 * @return {LonghandRound} the round that the rounds of one run share
 */
export function longhandContext(
  placeShorthands,
  boxSupport,
  pairShorthands,
  run
) {
  return new LonghandRound(placeShorthands, boxSupport, pairShorthands, run);
}

/**
 * Canonicalizes the blocks a record chain holds, in document order: each rule
 * and at-rule block that holds a declaration, then the blocks it nests.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index the block whose chain is walked
 * @param {LonghandRound} round
 * @return {void}
 */
function canonicalizeChildren(records, index, round) {
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const record = records.entry(entry);
    if (record.kind !== RULE && record.kind !== AT_RULE_BLOCK) continue;
    round.block(records, entry);
    canonicalizeChildren(records, entry, round);
  }
}

/**
 * The longhand round on the records: the root's own declarations are folded,
 * then every block that holds a declaration, then the columns are finished.
 *
 * @param {BlockRecords} records
 * @param {LonghandRound} round a round made with the records' run
 * @return {void}
 */
export function canonicalizeRecords(records, round) {
  round.root(records);
  canonicalizeChildren(
    records,
    /** @type {ArenaIndex} */ (records.root.index),
    round
  );
  round.finishColumns(records);
}
