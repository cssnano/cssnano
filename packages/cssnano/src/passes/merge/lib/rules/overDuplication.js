import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { Slot } from './blockRecords.js';
/** @import {BlockRecord} from './blockRecord.js' */
import { DeclarationRecord } from '../../../ir/declarationRecord.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

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
 * holds no block, and each declaration that is a child of a block. Walks the
 * dropped blocks too. Under consistency checks, throws when a node is reached
 * twice.
 *
 * @param {BlockRecords} records
 * @return {Map<string, number>}
 */
export function tallyDeclarations(records) {
  const reached = new Set();
  /** @type {Map<string, number>} */
  const written = new Map();
  /** @param {object} node */
  const reach = (node) => {
    if (reached.has(node)) throw new Error(TWICE);
    reached.add(node);
  };
  /** @param {DeclarationRecord} declaration */
  const count = (declaration) => {
    const key = declarationKey(declaration);
    written.set(key, (written.get(key) ?? 0) + 1);
  };
  /** @param {RuleRecord} record */
  const visitRule = (record) => {
    reach(record.node);
    const nested = record.block;
    if (nested !== -1) {
      walk(/** @type {BlockRecord} */ (records.block(nested)));
      return;
    }
    for (const declaration of record.declarations) count(declaration);
  };
  /** @param {BlockRecord} block */
  const walk = (block) => {
    for (const entry of block.children) {
      if (entry instanceof Slot) {
        for (const index of entry.rules) {
          visitRule(/** @type {RuleRecord} */ (records.rule(index)));
        }
      } else if (typeof entry === 'number') {
        const nested = /** @type {BlockRecord} */ (records.block(entry));
        reach(nested.node);
        walk(nested);
      } else {
        reach(entry);
        if (entry instanceof DeclarationRecord) count(entry);
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
 * @return {void}
 */
export function assertNoOverDuplication(records) {
  if (!consistencyChecksEnabled()) return;
  const written = tallyDeclarations(records);
  const input = records.inputWrites;
  if (input === null) return;
  for (const [key, count] of written) {
    if (count > (input.get(key) ?? 0)) throw new Error(OVER_WRITTEN);
  }
}
