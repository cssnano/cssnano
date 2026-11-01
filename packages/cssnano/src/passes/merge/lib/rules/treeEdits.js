import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { BlockRecords, Slot } from './blockRecords.js';
import { BlockRecord } from './blockRecord.js';
import { declarationIsEqual } from './declarations.js';
import { isDroppableWhenEmpty } from './droppableBlocks.js';
import { RuleRecord } from './ruleRecord.js';
import { containerContext } from './sameContainer.js';
import { tallyDeclarations } from './overDuplication.js';

/** @import {AtRule, ChildNode, Container, Root, Rule} from 'postcss' */
/** @import {PropertyWrites} from './propertyWrites.js' */
/** @import MergeState from './mergeState.js' */

/**
 * The edits that rule merging makes to the records of the stylesheet. Each one
 * updates the records it touches, so a join cannot leave a stale answer
 * behind. The PostCSS nodes catch up at write-back, which rebuilds the child
 * lists that changed. Lib code outside this module edits through these names.
 */

/**
 * @param {ChildNode} node
 * @return {boolean} whether the node holds rules or at-rules
 */
function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
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
  const records = new BlockRecords(new BlockRecord(root, -1, 0, false));
  records.add(records.root);
  records.root.leadingWhitespace = root.first?.raws.before;
  let nodes = 0;
  let declarations = 0;
  /**
   * Fills a block that the records hold already, and links each child to it.
   *
   * @param {BlockRecord} block
   */
  const fill = (block) => {
    block.context = containerContext(
      mergeState.declarationIds,
      records.block(block.parent)?.context ?? -1,
      block,
      textTable
    );
    for (const child of /** @type {ChildNode[]} */ (block.node.nodes)) {
      const index = block.children.length;
      if (isRuleOrAtRule(child)) nodes++;
      if (child.type === 'rule') {
        // A rule that holds a block keeps its declarations as block entries.
        const holds = child.nodes.some(isRuleOrAtRule);
        const record = records.recordRule(
          child,
          mergeState.properties,
          mergeState.declarationIds,
          holds ? [] : null
        );
        const slot = new Slot(block.index, index, [record.index]);
        record.place(block.index, index);
        block.children.push(slot);
        records.links.linkLast(block.index, record.index);
        if (holds) {
          const nested = new BlockRecord(child, block.index, index, false);
          records.add(nested);
          records.links.ownBlock(record.index, nested.index);
          record.setBlock(nested.index);
          fill(nested);
        } else {
          declarations += record.declarations.length;
        }
      } else if (child.type === 'atrule' && child.nodes) {
        const nested = new BlockRecord(
          child,
          block.index,
          index,
          isDroppableWhenEmpty(child, textTable)
        );
        records.add(nested);
        block.children.push(nested.index);
        records.links.linkLast(block.index, nested.index);
        fill(nested);
      } else if (child.type === 'decl') {
        declarations++;
        const declaration = records.blockDeclaration(
          child,
          mergeState.properties,
          mergeState.declarationIds
        );
        block.children.push(declaration.index);
        records.links.linkLast(block.index, declaration.index);
      } else {
        const entry = records.bareEntry(child);
        block.children.push(entry.index);
        records.links.linkLast(block.index, entry.index);
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
 * Takes a rule or an at-rule out of its parent's records at once. The PostCSS
 * child list catches up at write-back.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord | BlockRecord} entry the record of the rule, or the block of the at-rule
 * @return {void}
 */
export function remove(records, entry) {
  if (entry instanceof RuleRecord) {
    const slot = records.slotOf(entry);
    slot.rules.splice(slot.rules.indexOf(entry.index), 1);
    records.links.unlink(entry.index);
  } else {
    emptyEntry(records, entry);
  }
}

/**
 * Replaces the entry of a block with an empty slot, so the entry is skipped
 * from now on.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord} block
 * @return {void}
 */
function emptyEntry(records, block) {
  const holder = /** @type {BlockRecord} */ (records.block(block.parent));
  const { position } = block;
  holder.children[position] = new Slot(holder.index, position, []);
  records.links.unlink(block.index);
}

/**
 * Moves `earlier`, which already holds the joined content, to the place of
 * `later`, so the joined node takes the later position and keeps the
 * whitespace before `later`.
 *
 * @param {MergeState} mergeState
 * @param {Container} parent
 * @param {RuleRecord | BlockRecord} earlier the record of a rule, or the block of an at-rule
 * @param {RuleRecord | BlockRecord} later the record of a rule, or the block of an at-rule, of the same kind
 * @return {void}
 */
export function takePlaceOf(mergeState, parent, earlier, later) {
  // The first child of the stylesheet leaves its place, so the whitespace it
  // held passes to the child after it, which `later` gave to `earlier`.
  const { records } = mergeState;
  const { root } = records;
  if (
    parent.type === 'root' &&
    records.firstLiveChild(root.index) === earlier.node
  ) {
    root.leadingWhitespace = later.node.raws.before;
  }
  if (later instanceof RuleRecord) {
    const rule = /** @type {RuleRecord} */ (earlier);
    const laterSlot = records.slotOf(later);
    const earlierSlot = records.slotOf(rule);
    earlierSlot.rules.splice(earlierSlot.rules.indexOf(rule.index), 1);
    laterSlot.rules.splice(laterSlot.rules.indexOf(later.index), 1, rule.index);
    rule.place(laterSlot.block, laterSlot.position);
    records.links.takeLinkOf(later.index, rule.index);
  } else {
    const block = /** @type {BlockRecord} */ (earlier);
    const holder = /** @type {BlockRecord} */ (
      mergeState.records.block(block.parent)
    );
    const from = block.position;
    const to = later.position;
    holder.children[to] = block.index;
    block.position = to;
    holder.children[from] = new Slot(holder.index, from, []);
    records.links.takeLinkOf(later.index, block.index);
  }
  earlier.node.raws.before = later.node.raws.before;
}

/**
 * Appends the children of `incoming` to `receiving`, comments included. A
 * declaration of `incoming` is redundant only when the last declaration of
 * `receiving` that can set the same property already has an identical value.
 * Otherwise it revives an overridden value or overrides intermediate
 * declarations, so appending it is required to preserve the cascade result.
 *
 * @param {MergeState} mergeState
 * @param {RuleRecord} receiving
 * @param {PropertyWrites} index the writes of the declarations of `receiving`, extended in place
 * @param {RuleRecord} incoming
 * @return {void}
 */
export function appendToDeclarations(mergeState, receiving, index, incoming) {
  // Appending extends this list in place, so it is read once.
  const kept = receiving.declarations;
  for (const child of incoming.children) {
    if (child instanceof DeclarationRecord) {
      const last = index.lastConflict(child.keys);
      if (last !== -1 && declarationIsEqual(kept[last], child)) continue;
      index.record(child.keys, kept.length);
    }
    receiving.append(child);
  }
  incoming.depart();
}

/**
 * Removes `records` from the records of their parent. The PostCSS child list
 * catches up at write-back.
 *
 * @param {MergeState} mergeState
 * @param {Set<number>} indices the indices of the rules to remove
 * @return {void}
 */
export function removeRules(mergeState, indices) {
  const arena = mergeState.records;
  const { root } = arena;
  const first = arena.firstLiveChild(root.index);
  let leadsRoot = false;
  for (const index of indices) {
    const record = /** @type {RuleRecord} */ (arena.rule(index));
    leadsRoot ||= record.node === first;
    const slot = arena.slotOf(record);
    slot.rules.splice(slot.rules.indexOf(record.index), 1);
    arena.links.unlink(index);
    record.depart();
  }
  // Unlike `remove`, the rest keep their own whitespace, so the first of them
  // takes its own as the leading whitespace of the stylesheet.
  if (leadsRoot) {
    root.leadingWhitespace = arena.firstLiveChild(root.index)?.raws.before;
  }
}
