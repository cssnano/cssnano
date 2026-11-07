/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeEntry, ArenaIndex} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
import { BlockRecord, RULE } from './blockRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { assertLiveRule } from './linkChecks.js';

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
    if (entry instanceof DeclarationRecord) return entry;
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
    if (entry instanceof BlockRecord) yield entry;
  }
}

/**
 * The records of every container the run added that holds children: each
 * block, and each rule that nests. Dropped and departed ones included.
 *
 * @param {BlockRecords} records
 * @return {Generator<BlockRecord | RuleRecord>}
 */
export function* containers(records) {
  for (let index = 0; index < records.entryCount(); index++) {
    const entry = records.entry(/** @type {ArenaIndex} */ (index));
    if (entry instanceof BlockRecord) yield entry;
    else if (
      entry.kind === RULE &&
      /** @type {RuleRecord} */ (entry).context !== -1
    )
      yield /** @type {RuleRecord} */ (entry);
  }
}

/**
 * The number of children the block at `index` holds now. The chain keeps the
 * count, so the answer costs no walk.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {number}
 */
export function liveCount(records, index) {
  return records.links.childCount(index);
}

/**
 * The children the rule at `index` holds now, comments included. A comment there
 * says the output depends on it: a rule with a comment is kept as written.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that `recordRule` gave
 * @return {number}
 */
export function childCountOf(records, index) {
  assertLiveRule(records, index);
  return records.links.childCount(index);
}

/**
 * Whether the rule at `index` holds only declarations, as an empty rule does
 * when it holds no other child.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that `recordRule` gave
 * @return {boolean}
 */
export function holdsOnlyDeclarationsOf(records, index) {
  assertLiveRule(records, index);
  const rule = /** @type {RuleRecord} */ (
    records.entry(/** @type {ArenaIndex} */ (index))
  );
  return (
    records.links.childCount(index) ===
    rule.declarationKeys(records).keys.length
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
export function liveEntries(records, index) {
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
 * The children the block at `index` holds now, in order: the node of each
 * entry of its chain.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {ChildNode[]}
 */
export function liveChildren(records, index) {
  /** @type {ChildNode[]} */
  const children = [];
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    children.push(records.nodeOf(entry));
  }
  return children;
}

/**
 * Gives an appended child the whitespace of the last child when it has none, as
 * PostCSS gives it, so the records keep what the node will print.
 *
 * @param {{before: string | null}} child the record of the appended child
 * @param {{before: string | null} | undefined} last the record of the child before `child`
 * @return {void}
 */
export function inheritWhitespace(child, last) {
  if (child.before !== null || last === undefined) return;
  const sample = last.before;
  if (sample !== null) child.before = sample.replaceAll(/\S/gv, '');
}
