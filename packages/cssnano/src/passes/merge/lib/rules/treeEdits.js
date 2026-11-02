import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { BlockRecords } from './blockRecords.js';
import { BlockRecord } from './blockRecord.js';
import { declarationIsEqual } from './declarations.js';
import { isDroppableWhenEmpty } from './droppableBlocks.js';
import { containerContext } from './sameContainer.js';
import { tallyDeclarations } from './overDuplication.js';

/** @import {AtRule, ChildNode, Container, Root, Rule} from 'postcss' */
/** @import {RuleRecord} from './ruleRecord.js' */
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
 * Builds the records of a stylesheet from its tree, once per run. Each child is
 * linked into the chain of its parent. A rule that holds a rule or an at-rule
 * is a container too: its children are linked into its own chain.
 *
 * @param {Root} root
 * @param {MergeState} mergeState
 * @return {BlockRecords}
 */
export function buildRecords(root, mergeState) {
  const { textTable } = mergeState;
  const records = new BlockRecords(new BlockRecord(root, false));
  records.add(records.root);
  records.root.leadingWhitespace = root.first?.raws.before;
  let nodes = 0;
  let declarations = 0;
  /**
   * Fills a container that the records hold already, and links each child to
   * it. A nesting rule is filled as a block is.
   *
   * @param {BlockRecord | RuleRecord} container
   * @param {number} parentContext the context of the enclosing container, -1 for the stylesheet
   */
  const fill = (container, parentContext) => {
    container.context = containerContext(
      mergeState.declarationIds,
      parentContext,
      container,
      textTable
    );
    for (const child of /** @type {ChildNode[]} */ (container.node.nodes)) {
      if (isRuleOrAtRule(child)) nodes++;
      if (child.type === 'rule') {
        // A rule that holds a rule or an at-rule keeps its declarations in its chain.
        const holds = child.nodes.some(isRuleOrAtRule);
        const record = records.recordRule(
          child,
          mergeState.properties,
          mergeState.declarationIds,
          holds ? [] : null
        );
        records.links.linkLast(container.index, record.index);
        if (holds) {
          fill(record, container.context);
        } else {
          declarations += record.declarations.length;
        }
      } else if (child.type === 'atrule' && child.nodes) {
        const nested = new BlockRecord(
          child,
          isDroppableWhenEmpty(child, textTable)
        );
        records.add(nested);
        records.links.linkLast(container.index, nested.index);
        fill(nested, container.context);
      } else if (child.type === 'decl') {
        declarations++;
        const declaration = records.blockDeclaration(
          child,
          mergeState.properties,
          mergeState.declarationIds
        );
        records.links.linkLast(container.index, declaration.index);
      } else {
        const entry = records.bareEntry(child);
        records.links.linkLast(container.index, entry.index);
      }
    }
  };
  fill(records.root, -1);
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
  records.links.unlink(entry.index);
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
    records.links.firstChild(root.index) === earlier.index
  ) {
    root.leadingWhitespace = later.node.raws.before;
  }
  records.links.takeLinkOf(later.index, earlier.index);
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
  const first = arena.links.firstChild(root.index);
  let leadsRoot = false;
  for (const index of indices) {
    const record = /** @type {RuleRecord} */ (arena.rule(index));
    leadsRoot ||= index === first;
    arena.links.unlink(index);
    record.depart();
  }
  // Unlike `remove`, the rest keep their own whitespace, so the first of them
  // takes its own as the leading whitespace of the stylesheet.
  if (leadsRoot) {
    const head = arena.links.firstChild(root.index);
    root.leadingWhitespace =
      head === -1 ? undefined : arena.nodeOf(head).raws.before;
  }
}
