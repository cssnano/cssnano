import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import cssnanoUtils from '#utils';
import { BlockRecords } from './blockRecords.js';
import {
  atRuleKind,
  BlockRecord,
  COMMENT,
  LAYER,
  NO_PRELUDE,
  NodeEntry,
  STYLESHEET,
} from './blockRecord.js';
import { declarationIsEqual } from './declarations.js';
import { containerContext } from './sameContainer.js';
import { hasPendingEdits } from '../deferredChildEdits.js';
import { sourceSelector } from '../../../../utils/sourceText.js';
import { appendChild } from './arenaEdits.js';
import { receivingDeclarations } from './declarationCache.js';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/** @import {AtRule, ChildNode, Comment, Container, Root, Rule} from 'postcss' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import MergeState from './mergeState.js' */
/** @import {RunContext} from '../../../ir/runContext.js' */

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

const PENDING_EDITS = 'a container has edits its child list does not show';

/**
 * Builds the records of a stylesheet from its tree, once per run. Each child is
 * linked into the chain of its parent, and every rule is a container whose
 * children form its own chain.
 *
 * @param {Root} root
 * @param {RunContext} context the run's state, which gives the tokens and ids the records keep
 * @return {BlockRecords}
 */
export function buildRecords(root, context) {
  const { textTable } = context;
  const records = new BlockRecords(
    new BlockRecord(root, STYLESHEET, '', '', false, NO_PRELUDE)
  );
  records.add(records.root);
  records.root.leadingWhitespace = root.first?.raws.before ?? null;
  let nodes = 0;
  let declarations = 0;
  /**
   * Links each child of a container, which holds its context already, in
   * document order. A rule is linked into its parent, then its children.
   *
   * @param {BlockRecord | RuleRecord} container
   */
  const fillChildren = (container) => {
    // The build reads the child lists, which a pending edit has not rebuilt yet.
    if (consistencyChecksEnabled() && hasPendingEdits(container.node)) {
      throw new Error(PENDING_EDITS);
    }
    for (const child of /** @type {ChildNode[]} */ (container.node.nodes)) {
      if (isRuleOrAtRule(child)) nodes++;
      if (child.type === 'rule') {
        const source = sourceSelector(child);
        const record = records.recordRule(
          child,
          child.selectors,
          child.selector,
          source === child.selector ? undefined : source,
          textTable.stored(child)
        );
        record.before = child.raws.before ?? null;
        records.linkLast(container.index, record.index);
        // A rule that holds a rule or an at-rule nests, and gets its context.
        if (child.nodes.some(isRuleOrAtRule)) {
          record.context = containerContext(
            context.declarations,
            container.context,
            record
          );
        }
        fillChildren(record);
      } else if (child.type === 'atrule' && child.nodes) {
        const name = asciiLowerCase(child.name);
        const kind = atRuleKind(name);
        const nested = new BlockRecord(
          child,
          kind,
          name,
          child.params,
          kind === LAYER && isAnonymousLayer(child, textTable),
          context.declarations.preludeId(child)
        );
        nested.before = child.raws.before ?? null;
        records.add(nested);
        records.linkLast(container.index, nested.index);
        nested.context = containerContext(
          context.declarations,
          container.context,
          nested
        );
        fillChildren(nested);
      } else if (child.type === 'decl') {
        declarations++;
        const declaration = records.blockDeclaration(
          child,
          context.properties,
          context.declarations
        );
        records.linkLast(container.index, declaration.index);
      } else if (child.type === 'atrule') {
        const name = asciiLowerCase(child.name);
        const kind = atRuleKind(name);
        const entry = records.bareEntry(
          new NodeEntry(
            child,
            kind,
            name,
            child.params,
            kind === LAYER && isAnonymousLayer(child, textTable),
            context.declarations.preludeId(child)
          )
        );
        entry.before = child.raws.before ?? null;
        records.linkLast(container.index, entry.index);
      } else {
        const entry = records.bareEntry(
          new NodeEntry(child, COMMENT, '', '', false, NO_PRELUDE)
        );
        entry.before = child.raws.before ?? null;
        entry.text = /** @type {Comment} */ (child).text;
        entry.important = cssnanoUtils.isImportantComment(entry.text);
        records.linkLast(container.index, entry.index);
      }
    }
  };
  // The stylesheet's context is the one for no enclosing container.
  records.root.context = containerContext(
    context.declarations,
    -1,
    records.root
  );
  fillChildren(records.root);
  records.settle();
  // N + D + 1 rounds bound a run, see `runMerge`.
  records.maxRounds = nodes + declarations + 1;
  return records;
}

/**
 * Takes an entry out of its parent's records at once. The PostCSS child list
 * catches up at write-back.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord | BlockRecord | DeclarationRecord | NodeEntry} entry the record of the rule, the block of the at-rule, or another entry
 * @return {void}
 */
export function remove(records, entry) {
  records.unlink(entry.index);
}

/**
 * Moves the entry `earlier`, which already holds the joined content, to the
 * place of `later`, so the joined node takes the later position and keeps the
 * whitespace before `later`.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} earlier the index of a rule, or of the block of an at-rule
 * @param {ArenaIndex} later the index of a rule, or of the block of an at-rule, of the same kind
 * @return {void}
 */
export function takePlaceOf(records, earlier, later) {
  // The first child of the stylesheet leaves its place, so the whitespace it
  // held passes to the child after it, which `later` gave to `earlier`.
  const { root } = records;
  if (records.links.firstChild(root.index) === earlier) {
    root.leadingWhitespace = records.entry(later).before;
  }
  records.takeLinkOf(later, earlier);
  records.entry(earlier).before = records.entry(later).before;
}

/**
 * Appends the children of `incoming` to `receiving`, comments included. A
 * declaration of `incoming` is redundant only when the last declaration of
 * `receiving` that can set the same property already has an identical value.
 * Otherwise it revives an overridden value or overrides intermediate
 * declarations, so appending it is required to preserve the cascade result.
 *
 * Each pass reads the declarations of `receiving` before its duplicate test,
 * so a pass sees the appends before it. The loop's only edit of `receiving` is
 * appendChild, which keeps the entry fresh, so only the first read of a merge
 * can rebuild it.
 *
 * @param {MergeState} mergeState
 * @param {ArenaIndex} receiving
 * @param {ArenaIndex} incoming
 * @return {void}
 */
export function appendToDeclarations(mergeState, receiving, incoming) {
  const { records } = mergeState;
  const { links } = records;
  // Each child is unlinked before it is read, so the loop holds no link cursor
  // across an edit.
  for (
    let first = links.firstChild(incoming);
    first !== -1;
    first = links.firstChild(incoming)
  ) {
    const child = /** @type {DeclarationRecord | NodeEntry} */ (
      records.entry(first)
    );
    records.unlink(first);
    if (child instanceof DeclarationRecord) {
      const { kept, writes } = receivingDeclarations(records, receiving);
      const last = writes.lastConflict(child.keys);
      if (
        last !== -1 &&
        declarationIsEqual(
          /** @type {DeclarationRecord} */ (records.entry(kept[last])),
          child
        )
      )
        continue;
    }
    appendChild(
      records,
      /** @type {RuleRecord} */ (records.rule(receiving)),
      child
    );
  }
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
    // Under checks, `rule` throws when the root does not reach the rule.
    arena.rule(index);
    leadsRoot ||= index === first;
    arena.unlink(index);
  }
  // Unlike `remove`, the rest keep their own whitespace, so the first of them
  // takes its own as the leading whitespace of the stylesheet.
  if (leadsRoot) {
    const head = arena.links.firstChild(root.index);
    root.leadingWhitespace = head === -1 ? null : arena.entry(head).before;
  }
}
