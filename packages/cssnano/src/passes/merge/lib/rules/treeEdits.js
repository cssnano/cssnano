import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord, BlockRecords, Slot } from './blockRecords.js';
import { countDeclarations } from './sweepPotential.js';
import { declarationIsEqual } from './declarations.js';
import { isDroppableWhenEmpty } from './droppableBlocks.js';
import { getDecls } from './ruleRecord.js';
import { tallyDeclarations } from './overDuplication.js';

/** @import {AtRule, ChildNode, Container, Declaration, Root, Rule} from 'postcss' */
/** @import {PropertyWrites} from './lastWriteIndex.js' */
/** @import MergeState from './mergeState.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

/**
 * The only edits that rule merging makes to the live tree. Each one clears the
 * block summaries of the nodes it changes and updates the records it touches,
 * so a join cannot leave a stale answer behind. Lib code outside this module
 * edits through these names.
 */

/**
 * @param {ChildNode} node
 * @return {boolean} whether the node holds rules or at-rules
 */
function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

const BLOCK_DECLARATION_EDIT =
  'a declaration edit on a rule that holds a block';

/**
 * Under consistency checks, throws when a declaration edit reaches a rule that
 * holds a block, whose declarations stand in its block record.
 *
 * @param {RuleRecord} record
 * @return {void}
 */
function checkNoBlock(record) {
  if (consistencyChecksEnabled() && record.block !== null) {
    throw new Error(BLOCK_DECLARATION_EDIT);
  }
}

/**
 * Builds the records of a stylesheet from its tree, once per run. Each rule
 * gets a slot, and each rule that holds a rule or an at-rule gets the record
 * of its children.
 *
 * @param {Root} root
 * @param {MergeState} mergeState
 * @return {BlockRecords}
 */
export function buildRecords(root, mergeState) {
  const { textTable } = mergeState;
  const records = new BlockRecords(new BlockRecord(root, null, 0, false));
  records.root.leadingWhitespace = root.first?.raws.before;
  let nodes = 0;
  let declarations = 0;
  /** @param {BlockRecord} block */
  const fill = (block) => {
    records.add(block);
    for (const child of /** @type {ChildNode[]} */ (block.node.nodes)) {
      const index = block.children.length;
      if (isRuleOrAtRule(child)) nodes++;
      if (child.type === 'rule') {
        const slot = new Slot(block, index, [child]);
        const record = records.recordRule(child);
        record.place(slot);
        block.children.push(slot);
        if (child.nodes.some(isRuleOrAtRule)) {
          const nested = new BlockRecord(child, block, index, false);
          record.setBlock(nested);
          fill(nested);
        } else {
          declarations += countDeclarations(child);
        }
      } else if (child.type === 'atrule' && child.nodes) {
        const nested = new BlockRecord(
          child,
          block,
          index,
          isDroppableWhenEmpty(child, textTable)
        );
        block.children.push(nested);
        fill(nested);
      } else {
        if (child.type === 'decl') declarations++;
        block.children.push(child);
      }
    }
  };
  fill(records.root);
  if (consistencyChecksEnabled())
    records.inputWrites = tallyDeclarations(records);
  // N + D + 1 rounds bound a run, see `runMerge`.
  records.maxRounds = nodes + declarations + 1;
  return records;
}

/**
 * Appends the children of `from` to `into`, after its own, in the records. The
 * PostCSS child lists catch up at write-back. `from` is left empty, so the
 * caller removes or replaces it.
 *
 * @param {MergeState} mergeState
 * @param {Container} into
 * @param {Container} from
 * @return {void}
 */
export function moveChildren(mergeState, into, from) {
  const { records } = mergeState;
  const target = /** @type {BlockRecord} */ (records.blockOf(into));
  target.adopt(/** @type {BlockRecord} */ (records.blockOf(from)), records);
}

/**
 * Takes `node` out of its parent's records at once. The PostCSS child list
 * catches up at write-back.
 *
 * @param {MergeState} mergeState
 * @param {Rule | AtRule} node
 * @return {void}
 */
export function remove(mergeState, node) {
  if (node.type === 'rule') {
    const slot = /** @type {Slot} */ (mergeState.meta(node).slot);
    slot.rules.splice(slot.rules.indexOf(node), 1);
  } else {
    emptyEntry(/** @type {BlockRecord} */ (mergeState.records.blockOf(node)));
  }
}

/**
 * Replaces the entry of a block with an empty slot, so the entry is skipped
 * from now on.
 *
 * @param {BlockRecord} block
 * @return {void}
 */
function emptyEntry(block) {
  const holder = /** @type {BlockRecord} */ (block.parent);
  const { position } = block;
  holder.children[position] = new Slot(holder, position, []);
}

/**
 * Moves `earlier`, which already holds the joined content, to the place of
 * `later`, so the joined node takes the later position and keeps the
 * whitespace before `later`.
 *
 * @param {MergeState} mergeState
 * @param {Container} parent
 * @param {Rule | AtRule} earlier
 * @param {Rule | AtRule} later
 * @return {void}
 */
export function takePlaceOf(mergeState, parent, earlier, later) {
  // The first child of the stylesheet leaves its place, so the whitespace it
  // held passes to the child after it, which `later` gave to `earlier`.
  const { root } = mergeState.records;
  if (parent.type === 'root' && root.firstLiveChild() === earlier) {
    root.leadingWhitespace = later.raws.before;
  }
  if (later.type === 'rule') {
    const rule = /** @type {Rule} */ (earlier);
    const replaced = /** @type {Rule} */ (later);
    const laterSlot = /** @type {Slot} */ (mergeState.meta(replaced).slot);
    const earlierSlot = /** @type {Slot} */ (mergeState.meta(rule).slot);
    earlierSlot.rules.splice(earlierSlot.rules.indexOf(rule), 1);
    laterSlot.rules.splice(laterSlot.rules.indexOf(replaced), 1, rule);
    mergeState.meta(rule).place(laterSlot);
  } else {
    const { records } = mergeState;
    const block = /** @type {BlockRecord} */ (records.blockOf(earlier));
    const laterBlock = /** @type {BlockRecord} */ (records.blockOf(later));
    const holder = /** @type {BlockRecord} */ (block.parent);
    const from = block.position;
    const to = laterBlock.position;
    holder.children[to] = block;
    block.position = to;
    holder.children[from] = new Slot(holder, from, []);
  }
  earlier.raws.before = later.raws.before;
}

/**
 * Appends the content of `incoming` to `receiving`. A declaration of
 * `incoming` is redundant only when the last declaration of `receiving` that
 * can set the same property already has an identical value. Otherwise it
 * revives an overridden value or overrides intermediate declarations, so
 * appending it is required to preserve the cascade result.
 *
 * @param {MergeState} mergeState
 * @param {Rule} receiving
 * @param {Declaration[]} kept the declarations of `receiving`, extended in place
 * @param {PropertyWrites} index the writes of `kept`, extended in place
 * @param {Rule} incoming
 * @return {void}
 */
export function appendToDeclarations(
  mergeState,
  receiving,
  kept,
  index,
  incoming
) {
  const record = mergeState.meta(receiving);
  checkNoBlock(record);
  // Read before the loop empties `incoming`, while its record still matches it.
  const departing = mergeState.meta(incoming);
  for (const node of incoming.nodes.slice()) {
    if (node.type === 'decl') {
      const last = index.lastConflict(node);
      if (last !== -1 && declarationIsEqual(kept[last], node)) {
        node.remove();
        continue;
      }
      index.record(node, kept.length);
      kept.push(node);
    }
    receiving.append(node);
  }
  record.takeDeclarations(kept);
  departing.depart();
}

/**
 * Removes `declarations` from `rule`, which keeps the others.
 *
 * @param {MergeState} mergeState
 * @param {Rule} rule
 * @param {Declaration[]} declarations
 * @return {void}
 */
export function removeDeclarations(mergeState, rule, declarations) {
  // Read before the removal, while the record still matches the rule.
  const record = mergeState.meta(rule);
  checkNoBlock(record);
  for (const declaration of declarations) declaration.remove();
  record.takeDeclarations(getDecls(rule));
}

/**
 * Removes `rules` from the records of their parent. The PostCSS child list
 * catches up at write-back.
 *
 * @param {MergeState} mergeState
 * @param {Set<Rule>} rules
 * @return {void}
 */
export function removeRules(mergeState, rules) {
  const { root } = mergeState.records;
  const leadsRoot = rules.has(/** @type {Rule} */ (root.firstLiveChild()));
  for (const rule of rules) {
    const record = mergeState.meta(rule);
    const slot = /** @type {Slot} */ (record.slot);
    slot.rules.splice(slot.rules.indexOf(rule), 1);
    record.depart();
  }
  // Unlike `remove`, the rest keep their own whitespace, so the first of them
  // takes its own as the leading whitespace of the stylesheet.
  if (leadsRoot) root.leadingWhitespace = root.firstLiveChild()?.raws.before;
}

/**
 * Marks a rule that a placement drops as departed. The rule leaves the tree
 * when `replaceChildren` applies the placement, and reading its record throws
 * from now on.
 *
 * @param {MergeState} mergeState
 * @param {Rule} rule
 * @return {void}
 */
export function depart(mergeState, rule) {
  mergeState.meta(rule).depart();
}
