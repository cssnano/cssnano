import {
  firstDeclaration,
  inheritWhitespace,
  nextDeclaration,
} from './blockChildren.js';
import { AT_RULE_STATEMENT, NodeEntry, atRuleKindOf } from './blockRecord.js';
import { DeclarationRecord } from './declarationRecord.js';
import { keysOfName } from './propertyTable.js';
import { tokenizeMode } from '../../values/tokenizeMode.js';
import { tokensText } from '../../values/tokensText.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockDeclarations, DeclarationItem} from '../merge/lib/longhand/blockDeclarations.js' */
/** @import {RunContext} from './runContext.js' */
/** @import {TokenListId} from './tokenLists.js' */

/*
 * The edits that compose the arena's link wrappers. Each takes the arena
 * first and calls only its public wrappers, so the checks run at every link.
 */

/**
 * Replaces the rule `record` with the rules `replacements`, which take its
 * place in the chain, in order. A replacement that already stands right before
 * `record` is the first of them and stays where it is; the others are linked
 * nowhere.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} record the index of the rule that is replaced
 * @param {ArenaIndex[]} replacements
 * @return {void}
 */
export function substitute(records, record, replacements) {
  // A replacement that already stands before the record stays. The record may
  // be one of the replacements, which keeps it in place: the ones after it
  // then go before the entry that followed it, so the order holds.
  // A record that is substituted is linked, so its container is an index.
  const holder = /** @type {ArenaIndex} */ (records.links.parentOf(record));
  const standing = records.links.prevSibling(record);
  /** @type {ArenaIndex | -1 | undefined} the entry after the kept record, read when the record is passed */
  let following;
  let kept = false;
  for (const replacement of replacements) {
    if (replacement === standing) continue;
    if (replacement === record) {
      kept = true;
    } else if (!kept) {
      records.moveBefore(record, replacement);
    } else {
      following ??= records.links.nextSibling(record);
      if (following === -1) records.moveLast(holder, replacement);
      else records.moveBefore(following, replacement);
    }
  }
  if (!kept) records.detach(record);
}

/**
 * Places the unplaced entry `entry` right before `sibling`, in the chain that
 * holds `sibling`.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} sibling a linked entry that `entry` stands before
 * @param {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} entry
 * @return {ArenaIndex} the index the arena gave the entry
 */
export function placeBefore(records, sibling, entry) {
  records.insertEntryBefore(sibling, entry);
  return /** @type {ArenaIndex} */ (entry.index);
}

/**
 * Places a new at-rule statement right before `sibling`. Write-back creates its
 * node with the source of `template`'s node and the prelude the list spells.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} sibling a linked entry that the statement stands before
 * @param {{name: string, preludeId: TokenListId, before: string | null, between: string | null, afterName: string | null, template: ArenaIndex}} statement
 * @return {ArenaIndex} the index the arena gave the statement
 */
export function placeStatementBefore(records, sibling, statement) {
  const entry = new NodeEntry(
    AT_RULE_STATEMENT,
    statement.before,
    atRuleKindOf(statement.name),
    statement.name,
    false,
    statement.preludeId
  );
  entry.between = statement.between;
  entry.afterName = statement.afterName;
  entry.template = statement.template;
  return placeBefore(records, sibling, entry);
}

/**
 * Moves the rule `record` to the end of the chain of the block at `target`.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} target the index of the block that takes the rule
 * @param {ArenaIndex} record the index of the rule
 * @return {void}
 */
export function moveRule(records, target, record) {
  records.moveLast(target, record);
}

/**
 * Moves the chain of the block at `source` to the end of the chain of the
 * block at `target`. `source` is left with no children, since the caller
 * removes it. A nested block keeps its rule, which moves with the chain.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} target
 * @param {ArenaIndex} source
 * @return {void}
 */
export function adopt(records, target, source) {
  // Under checks, `records.block` throws unless `source` is a block.
  records.block(source);
  let entry = records.links.firstChild(source);
  while (entry !== -1) {
    records.moveLast(target, entry);
    entry = records.links.firstChild(source);
  }
}

/**
 * Appends a child to the chain of a rule, after its last child, and gives the
 * child the whitespace of that child when it has none. The node takes it at
 * write-back. A child that is linked elsewhere moves to the end.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} rule the index of the rule
 * @param {ArenaIndex} child the index of the child
 * @return {void}
 */
export function appendChild(records, rule, child) {
  inheritWhitespace(records, child, records.links.lastChild(rule));
  records.moveLast(rule, child);
}

/**
 * Removes the declarations at the arena indices `claimed` from the chain of
 * the rule at `rule`. The node drops them at write-back.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} rule
 * @param {Set<ArenaIndex>} claimed the declarations that leave, each a child of `rule`
 * @return {void}
 */
export function removeDeclarations(records, rule, claimed) {
  if (records.consistencyChecks) assertChildrenOf(records, rule, claimed);
  for (const index of claimed) records.detach(index);
}

/**
 * Moves the declarations at the arena indices `claimed`, in order, from the
 * chain of `source` to the end of the chain of `target`. The node of `source`
 * keeps them until write-back.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} source
 * @param {ArenaIndex} target
 * @param {ArenaIndex[]} claimed the declarations that move, in their chain order
 * @return {void}
 */
export function moveDeclarations(records, source, target, claimed) {
  if (records.consistencyChecks) assertMovesInOrder(records, source, claimed);
  records.rule(target);
  for (const index of claimed) appendChild(records, target, index);
}

/**
 * The value list of a working item, interned in the run's table. The item
 * always holds its tokens, so no text is tokenized here.
 *
 * @param {RunContext} context
 * @param {DeclarationItem} item
 * @return {TokenListId}
 */
function valueListOfItem(context, item) {
  return context.valueIds.idOf(
    context.tokenLists,
    tokenizeMode(item.prop),
    item.value,
    item.tokens
  );
}

/**
 * Gives an authored declaration the fields of its rewritten item. The raw value
 * is dropped at write-back, which `marked` tells it to do.
 *
 * @param {RunContext} context
 * @param {DeclarationRecord} record
 * @param {DeclarationItem} item
 * @return {void}
 */
function rewriteRecord(context, record, item) {
  if (item.prop !== record.prop) {
    record.prop = item.prop;
    record.keys = keysOfName(item.prop);
  }
  record.valueList = valueListOfItem(context, item);
  record.writtenList = -1;
  record.rawAfterValue = null;
  record.id = context.declarations.keyOf(
    record.prop,
    record.valueList,
    record.important,
    record.before
  );
  record.marked = true;
}

/**
 * Writes the context of a container, which the walk computes again after it
 * edits the selector or prelude that the context reads.
 *
 * @param {BlockRecord | RuleRecord} record
 * @param {number} context
 * @return {void}
 */
export function writeContainerContext(record, context) {
  /** @type {{context: number}} */ (/** @type {unknown} */ (record)).context =
    context;
}

/**
 * Writes the prelude of an at-rule: its list is interned in the run, and the
 * record marks the prelude so write-back assigns its text. The walk of the
 * write reaches every entry, so the edit stamps nothing.
 *
 * @param {RunContext} context
 * @param {BlockRecord | NodeEntry} record the at-rule's block or statement record
 * @param {readonly CSSToken[]} list the prelude's tokens
 * @return {void}
 */
export function writePrelude(context, record, list) {
  record.preludeId = context.valueIds.idOf(
    context.tokenLists,
    undefined,
    tokensText(list),
    list
  );
  record.writtenList = -1;
  record.marked = true;
}

/**
 * The record of a clone: the item's fields, with the support its source
 * required and a template that has a node.
 *
 * @param {RunContext} context
 * @param {DeclarationItem} item
 * @param {DeclarationRecord} anchor the record of the clone's source
 * @param {ArenaIndex} anchorIndex the index of `anchor`
 * @return {DeclarationRecord}
 */
function cloneRecordOf(context, item, anchor, anchorIndex) {
  const valueList = valueListOfItem(context, item);
  const before = item.before ?? null;
  const record = new DeclarationRecord(
    before,
    item.prop,
    valueList,
    item.important,
    keysOfName(item.prop),
    context.declarations.keyOf(item.prop, valueList, item.important, before),
    item.between ?? null,
    item.importantSpelling ?? null
  );
  record.inheritedSupport = item.inheritedSupport;
  record.marked = true;
  record.template = anchor.template !== -1 ? anchor.template : anchorIndex;
  return record;
}

/**
 * Commits the working list of one block to the arena: the one edit the longhand
 * rounds make. The clones are placed first, each right after its source, so a
 * removed source still fixes where they land. Then the removals, then the
 * rewrites. The block's declaration stamp moves once when anything was
 * rewritten or cloned.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} container the index of the block or rule the list was read from
 * @param {BlockDeclarations} list the list, as the reducers left it
 * @return {void}
 */
export function commitDeclarations(records, context, container, list) {
  if (!list.edited) return;
  // The authored items come first, as the list was read; the clones follow.
  /** @type {ArenaIndex[]} the arena index of each item, by position */
  const placed = [...list.indexes];
  const authored = placed.length;
  if (context.consistencyChecks) assertChildrenOf(records, container, placed);
  let edited = false;
  for (let position = authored; position < list.length; position++) {
    const item = list.at(position);
    const anchor = placed[item.source];
    const record = cloneRecordOf(
      context,
      item,
      /** @type {DeclarationRecord} */ (records.entry(anchor)),
      anchor
    );
    const next = records.links.nextSibling(anchor);
    if (next === -1) records.appendEntry(container, record);
    else placeBefore(records, next, record);
    placed.push(/** @type {ArenaIndex} */ (record.index));
    edited = true;
  }

  /** @type {Set<ArenaIndex>} */
  const removed = new Set();
  for (let position = 0; position < list.length; position++) {
    if (list.at(position).removed) removed.add(placed[position]);
  }
  if (removed.size > 0) removeDeclarations(records, container, removed);

  for (let position = 0; position < authored; position++) {
    const item = list.at(position);
    if (item.rewritten && !item.removed) {
      rewriteRecord(
        context,
        /** @type {DeclarationRecord} */ (records.entry(placed[position])),
        item
      );
      edited = true;
    }
  }
  if (edited) records.touchDeclarations(container);
}

const NOT_A_CHILD =
  'a declaration is removed from a rule that does not hold it';
const OUT_OF_ORDER = 'declarations are moved out of their chain order';

/**
 * Under checks, throws when an index in `claimed` is not a child of `rule`.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} rule
 * @param {Iterable<ArenaIndex>} claimed
 * @return {void}
 * @throws {Error} under checks, for the first index that `rule` does not hold
 */
function assertChildrenOf(records, rule, claimed) {
  for (const index of claimed) {
    if (records.links.parentOf(index) !== rule) throw new Error(NOT_A_CHILD);
  }
}

/**
 * Under checks, throws when a declaration moves from `source` in another
 * order than its chain, or when `source` does not hold it. The chain of
 * `source` is walked once.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} source
 * @param {ArenaIndex[]} claimed
 * @return {void}
 * @throws {Error} under checks, when a claimed index is not a child of `source` in order
 */
function assertMovesInOrder(records, source, claimed) {
  assertChildrenOf(records, source, claimed);
  let at = 0;
  for (
    let declaration = firstDeclaration(records, source);
    declaration !== undefined && at < claimed.length;
    declaration = nextDeclaration(records, declaration)
  ) {
    if (declaration.index === claimed[at]) at++;
  }
  if (at !== claimed.length) throw new Error(OUT_OF_ORDER);
}
