import { firstDeclaration, nextDeclaration } from './blockChildren.js';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';

/** @import {BlockRecords} from './blockRecords.js' */

const TWICE = 'the records reach a node twice';
const OVER_WRITTEN =
  'a declaration is written more often than the input wrote it';

/**
 * The key by which a declaration is counted: its property, value and
 * `!important` flag, so a copy of a declaration counts as the same one.
 *
 * @param {{prop: string, value: string, important?: boolean}} node a
 * declaration record, or a PostCSS declaration
 * @return {string}
 */
function declarationKey(node) {
  return JSON.stringify([node.prop, node.value, Boolean(node.important)]);
}

/**
 * Counts the declarations that the records hold by key: those of each rule that
 * holds no block, and each declaration that is a child of a block. Under
 * consistency checks, throws when a node is reached twice.
 *
 * @param {BlockRecords} records
 * @return {Map<string, number>}
 */
export function tallyDeclarations(records) {
  /** @type {Set<number>} the arena indices of the entries the records reach */
  const reached = new Set();
  /** @type {Map<string, number>} */
  const written = new Map();
  /** @param {number} index */
  const reach = (index) => {
    if (reached.has(index)) throw new Error(TWICE);
    reached.add(index);
  };
  /** @param {DeclarationRecord} declaration */
  const count = (declaration) => {
    const key = declarationKey(declaration);
    written.set(key, (written.get(key) ?? 0) + 1);
  };
  /** @param {RuleRecord} record */
  const visitRule = (record) => {
    reach(record.index);
    if (record.context !== -1) {
      walk(record);
      return;
    }
    for (
      let declaration = firstDeclaration(records, record.index);
      declaration !== undefined;
      declaration = nextDeclaration(records, declaration)
    ) {
      count(declaration);
    }
  };
  /** @param {BlockRecord | RuleRecord} block the block, or the rule that nests */
  const walk = (block) => {
    const { links } = records;
    for (
      let entry = links.firstChild(block.index);
      entry !== -1;
      entry = links.nextSibling(entry)
    ) {
      const item = records.entry(entry);
      if (item instanceof RuleRecord) {
        visitRule(item);
      } else if (item instanceof BlockRecord) {
        reach(entry);
        walk(item);
      } else {
        reach(entry);
        if (item instanceof DeclarationRecord) count(item);
      }
    }
  };
  walk(records.root);
  return written;
}

/**
 * Under consistency checks, throws when the records reach a node twice, or hold
 * a declaration more often than the input wrote it. The sweeps and joins only
 * move and rewrite rules, so no declaration is written again.
 *
 * @param {BlockRecords} records
 * @param {Map<string, number> | null} input the tally of the input, or null when none was taken
 * @return {void}
 */
export function assertNoOverDuplication(records, input) {
  if (!consistencyChecksEnabled()) return;
  const written = tallyDeclarations(records);
  if (input === null) return;
  for (const [key, count] of written) {
    if (count > (input.get(key) ?? 0)) throw new Error(OVER_WRITTEN);
  }
}
