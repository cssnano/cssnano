import cssnanoUtils from '#utils';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import {
  BlockRecord,
  COMMENT,
  CONDITIONAL_GROUP,
  IMPORT,
  isAtRuleKind,
  LAYER,
  NodeEntry,
} from '../rules/blockRecord.js';
import { RuleRecord } from '../rules/ruleRecord.js';
import { remove } from '../rules/treeEdits.js';
import { commentId, containerId, statementId } from './structuralIds.js';

/** @import {Comment} from 'postcss' */
/** @import {BlockRecords} from '../rules/blockRecords.js' */
/** @import {RunContext} from '../../../ir/runContext.js' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */

const { isImportantComment } = cssnanoUtils;

// The entry was removed; a kept entry returns its structural id, or 0 when no
// ancestor needs one.
const REMOVED = -1;

/**
 * Declarations already kept in a container, shared by the sibling at-rules
 * whose conditions are identical.
 * @typedef {{
 *   decls?: Set<number>,
 *   ruleDecls?: Map<string, Set<number>>,
 *   children?: Map<number, Scope>,
 * }} Scope
 */

/**
 * @typedef {{
 *   records: BlockRecords,
 *   keys: DeclarationKeys,
 *   layered: Set<number>,
 * }} Run
 */

/**
 * @param {BlockRecord | RuleRecord | NodeEntry | DeclarationRecord} entry
 * @return {boolean} whether the entry is a rule or an at-rule
 */
function isContainerEntry(entry) {
  return (
    entry instanceof RuleRecord ||
    entry instanceof BlockRecord ||
    (entry instanceof NodeEntry && entry.node.type === 'atrule')
  );
}

/**
 * Whether a container keeps anything but ordinary comments.
 *
 * @param {Run} run
 * @param {BlockRecord | RuleRecord} container
 * @return {boolean}
 */
function hasContent(run, container) {
  const { records } = run;
  for (
    let index = records.links.firstChild(container.index);
    index !== -1;
    index = records.links.nextSibling(index)
  ) {
    const entry = records.entry(index);
    if (
      !(entry instanceof NodeEntry && entry.node.type === 'comment') ||
      isImportantComment(entry.node.text)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * @param {Scope} scope
 * @param {number} context the context of a block, which names its scope
 * @return {Scope}
 */
function childScope(scope, context) {
  const children = (scope.children ??= new Map());
  let child = children.get(context);
  if (!child) {
    child = {};
    children.set(context, child);
  }
  return child;
}

/**
 * Dedupes the entries of a container, back to front, against the scope of the
 * container. Each entry is read before it is handled, so a removal is safe.
 *
 * @param {Run} run
 * @param {BlockRecord | RuleRecord} container
 * @param {Scope} scope
 * @param {boolean} wantIds whether an ancestor needs the ids of the kept entries
 * @return {number[] | undefined} the ids of the kept entries, back to front, when `wantIds`
 */
function dedupeEntries(run, container, scope, wantIds) {
  const { records } = run;
  const { links } = records;
  /** @type {number[] | undefined} */
  const ids = wantIds ? [] : undefined;
  /** @type {Set<number> | undefined} */
  let seenAtRules;
  for (let index = links.lastChild(container.index); index !== -1;) {
    const prev = links.prevSibling(index);
    const entry = records.entry(index);
    let id;
    if (entry instanceof DeclarationRecord) {
      id = dedupeDeclaration(run, entry, scope);
    } else if (entry instanceof RuleRecord) {
      id = dedupeRule(run, entry, scope, wantIds);
    } else if (entry instanceof BlockRecord) {
      id = dedupeBlock(run, entry, scope, (seenAtRules ??= new Set()), wantIds);
    } else {
      id = dedupeNode(run, entry, (seenAtRules ??= new Set()), wantIds);
    }
    if (ids && id !== REMOVED) ids.push(id);
    index = prev;
  }
  return ids;
}

/**
 * @param {Run} run
 * @param {DeclarationRecord} entry
 * @param {Scope} scope
 * @return {number} the declaration's id, or REMOVED
 */
function dedupeDeclaration(run, entry, scope) {
  const { id } = entry;
  const seen = (scope.decls ??= new Set());
  if (seen.has(id)) {
    remove(run.records, entry);
    return REMOVED;
  }
  seen.add(id);
  return id;
}

/**
 * A rule first dedupes its declarations against the rules of its selector in
 * the scope. Then, when it nests, it dedupes its children against a scope of
 * its own, and a rule that nests nothing after that is plain.
 *
 * @param {Run} run
 * @param {RuleRecord} rule
 * @param {Scope} scope
 * @param {boolean} wantIds
 * @return {number}
 */
function dedupeRule(run, rule, scope, wantIds) {
  const { records } = run;
  const { links } = records;
  const { selector } = rule;
  const ruleDecls = (scope.ruleDecls ??= new Map());
  let declMap = ruleDecls.get(selector);
  const isSubsequent = declMap !== undefined;
  if (!declMap) {
    declMap = new Set();
    ruleDecls.set(selector, declMap);
  }

  let hasContainers = false;
  for (let index = links.lastChild(rule.index); index !== -1;) {
    const prev = links.prevSibling(index);
    const entry = records.entry(index);
    if (entry instanceof DeclarationRecord) {
      if (declMap.has(entry.id)) remove(records, entry);
      else declMap.add(entry.id);
    } else if (isContainerEntry(entry)) {
      hasContainers = true;
    }
    index = prev;
  }

  if (isSubsequent && !hasContent(run, rule)) {
    remove(records, rule);
    rule.depart();
    return REMOVED;
  }

  if (!hasContainers && !wantIds) return 0;
  // The second walk visits the declarations too; the ones that survived the
  // first are distinct, so it removes none of them.
  const childIds = dedupeEntries(run, rule, {}, wantIds);
  if (hasContainers && !hasNestedEntry(records, rule)) rule.context = -1;
  return wantIds && childIds
    ? containerId(run.keys, run.layered, rule, childIds)
    : 0;
}

/**
 * @param {BlockRecords} records
 * @param {RuleRecord} rule
 * @return {boolean} whether a rule or an at-rule is still linked in the rule
 */
function hasNestedEntry(records, rule) {
  for (
    let index = records.links.firstChild(rule.index);
    index !== -1;
    index = records.links.nextSibling(index)
  ) {
    if (isContainerEntry(records.entry(index))) return true;
  }
  return false;
}

/**
 * An at-rule with a block. Blocks of one named layer form a single layer, and
 * a layer is never removed as a duplicate. Other blocks compare by their ids.
 *
 * @param {Run} run
 * @param {BlockRecord} block
 * @param {Scope} scope
 * @param {Set<number>} seenAtRules the ids of the kept at-rules of the container
 * @param {boolean} wantIds
 * @return {number}
 */
function dedupeBlock(run, block, scope, seenAtRules, wantIds) {
  if (block.kind === LAYER) {
    const ids = dedupeEntries(
      run,
      block,
      childScope(scope, block.context),
      wantIds
    );
    return wantIds && ids ? containerId(run.keys, run.layered, block, ids) : 0;
  }

  // Identical preludes apply their contents under the same condition; other
  // at-rules have semantics this plugin does not model.
  if (block.kind === CONDITIONAL_GROUP) {
    // An emptied conditional group has no effect.
    const hadContent = hasContent(run, block);
    const ids = dedupeEntries(
      run,
      block,
      childScope(scope, block.context),
      true
    );
    if (hadContent && !hasContent(run, block)) {
      remove(run.records, block);
      return REMOVED;
    }
    return keepAtRule(run, block, ids, seenAtRules);
  }

  const ids = dedupeEntries(run, block, {}, true);
  // An imported style sheet may declare layers, so even an identical earlier
  // @import can fix a layer's place in the layer order.
  if (block.kind === IMPORT)
    return wantIds && ids ? containerId(run.keys, run.layered, block, ids) : 0;
  return keepAtRule(run, block, ids, seenAtRules);
}

/**
 * Removes a block at-rule that repeats an earlier one in its container, unless
 * it declares a layer, or keeps its id for the entries before it.
 *
 * @param {Run} run
 * @param {BlockRecord} block
 * @param {number[] | undefined} ids the ids of its kept entries, back to front
 * @param {Set<number>} seenAtRules
 * @return {number}
 */
function keepAtRule(run, block, ids, seenAtRules) {
  const id = containerId(run.keys, run.layered, block, ids ?? []);
  if (seenAtRules.has(id) && !run.layered.has(id)) {
    remove(run.records, block);
    return REMOVED;
  }
  seenAtRules.add(id);
  return id;
}

/**
 * A comment, or a statement at-rule, which has no block.
 *
 * @param {Run} run
 * @param {NodeEntry} entry
 * @param {Set<number>} seenAtRules
 * @param {boolean} wantIds
 * @return {number}
 */
function dedupeNode(run, entry, seenAtRules, wantIds) {
  if (entry.kind === COMMENT) {
    return wantIds
      ? commentId(run.keys, /** @type {Comment} */ (entry.node))
      : 0;
  }
  if (!isAtRuleKind(entry.kind)) return 0;
  // A statement layer is never removed, and an @import is kept too.
  if (entry.kind === LAYER || entry.kind === IMPORT) {
    return wantIds ? statementId(run.keys, run.layered, entry) : 0;
  }
  const id = statementId(run.keys, run.layered, entry);
  if (seenAtRules.has(id) && !run.layered.has(id)) {
    remove(run.records, entry);
    return REMOVED;
  }
  seenAtRules.add(id);
  return id;
}

/**
 * Removes duplicate rules, declarations and at-rules from the records. Each
 * removal takes effect in the records at once; write-back writes them out.
 *
 * @param {BlockRecords} records
 * @param {readonly string[]} _browsers unused: dedupe does not depend on the targets
 * @param {RunContext} context the run's state, whose ids the records use
 * @return {void}
 */
export function discardDuplicates(records, _browsers, context) {
  dedupeEntries(
    { records, keys: context.declarations, layered: new Set() },
    records.root,
    {},
    false
  );
}
