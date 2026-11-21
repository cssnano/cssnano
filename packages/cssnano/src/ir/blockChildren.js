/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex, BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
import { AT_RULE_BLOCK, DECLARATION, RULE, STYLESHEET } from './blockRecord.js';
/** @import {DeclarationRecord} from './declarationRecord.js' */

/**
 * The first declaration at or after `index` in the chain, or undefined.
 *
 * @param {BlockRecords} records
 * @param {number} index the entry to start from, or -1
 * @return {DeclarationRecord | undefined}
 */
function declarationFrom(records, index) {
  for (
    let at = index;
    at !== -1;
    at = records.links.nextSibling(/** @type {ArenaIndex} */ (at))
  ) {
    const entry = records.entry(/** @type {ArenaIndex} */ (at));
    if (entry.kind === DECLARATION) return entry;
  }
  return undefined;
}

/**
 * The first declaration the container at `index` holds now.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that the arena gave, of a container
 * @return {DeclarationRecord | undefined}
 */
export function firstDeclaration(records, index) {
  return declarationFrom(records, records.links.firstChild(index));
}

/**
 * The declaration after `declaration` in its chain.
 *
 * @param {BlockRecords} records
 * @param {DeclarationRecord} declaration a declaration linked in a chain
 * @return {DeclarationRecord | undefined}
 */
export function nextDeclaration(records, declaration) {
  return declarationFrom(records, records.links.nextSibling(declaration.index));
}

/**
 * The records of every block the run added, dropped ones included.
 *
 * @param {BlockRecords} records
 * @return {Generator<BlockRecord>}
 */
export function* blocks(records) {
  for (let index = 0; index < records.entryCount(); index++) {
    const entry = records.entry(/** @type {ArenaIndex} */ (index));
    if (entry.kind === STYLESHEET || entry.kind === AT_RULE_BLOCK) yield entry;
  }
}

/**
 * The records of every container the run added that holds children: each
 * block, and each rule that nests. Dropped ones included.
 *
 * @param {BlockRecords} records
 * @return {Generator<BlockRecord | RuleRecord>}
 */
export function* containers(records) {
  for (let index = 0; index < records.entryCount(); index++) {
    const entry = records.entry(/** @type {ArenaIndex} */ (index));
    if (entry.kind === STYLESHEET || entry.kind === AT_RULE_BLOCK) yield entry;
    else if (entry.kind === RULE && entry.context !== -1) yield entry;
  }
}

/**
 * The children the rule at `index` holds now, comments included. A comment there
 * says the output depends on it: a rule with a comment is kept as written.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that the arena gave
 * @return {number}
 */
export function childCountOf(records, index) {
  records.rule(index);
  return records.links.childCount(index);
}

/**
 * Whether the rule at `index` holds only declarations, as an empty rule does
 * when it holds no other child.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that the arena gave
 * @return {boolean}
 */
export function holdsOnlyDeclarationsOf(records, index) {
  records.rule(index);
  return (
    records.links.childCount(index) ===
    records.declarations.keysOf(records, /** @type {ArenaIndex} */ (index)).kept
      .length
  );
}

/**
 * The entries the block at `index` holds now, in order: the record of each
 * rule, the record of each at-rule block, the record of each declaration, and
 * the record of each bare node.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {(RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[]}
 */
export function childEntriesOf(records, index) {
  /** @type {(RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[]} */
  const entries = [];
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    entries.push(
      /** @type {RuleRecord | BlockRecord | DeclarationRecord | NodeEntry} */ (
        records.entry(entry)
      )
    );
  }
  return entries;
}

/**
 * Gives an appended child the whitespace of the last child when it has none, as
 * PostCSS gives it, so the records keep what the node will print.
 *
 * @param {BlockRecords} records the arena that holds both children
 * @param {ArenaIndex} child the index of the appended child
 * @param {ArenaIndex | -1} last the index of the child before `child`, or -1 for none
 * @return {void}
 */
export function inheritWhitespace(records, child, last) {
  const entry = records.entry(child);
  if (entry.before !== null || last === -1) return;
  const sample = records.entry(last).before;
  if (sample !== null) entry.before = sample.replaceAll(/\S/gv, '');
}

/**
 * The declarations of the rule at `index`, in order, read from its chain at the
 * call. A reader that indexes them by position takes this array.
 *
 * @param {BlockRecords} records the arena that holds the rule's children
 * @param {number} index the rule's index
 * @return {DeclarationRecord[]}
 */
export function declarationsOf(records, index) {
  // Under checks, `rule` throws when the root does not reach this rule.
  records.rule(index);
  /** @type {DeclarationRecord[]} */
  const declarations = [];
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const item = records.entry(entry);
    if (item.kind === DECLARATION) declarations.push(item);
  }
  return declarations;
}
