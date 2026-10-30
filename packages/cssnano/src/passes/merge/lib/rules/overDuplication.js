import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord, Slot } from './blockRecords.js';

/** @import {Declaration, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */

const TWICE = 'the records reach a node twice';
const OVER_WRITTEN =
  'a declaration is written more often than the input wrote it';

/**
 * The key by which a declaration is counted: its property, value and
 * `!important` flag, so a copy of a declaration counts as the same one.
 *
 * @param {Declaration} node
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
  /** @param {Declaration} node */
  const count = (node) => {
    const key = declarationKey(node);
    written.set(key, (written.get(key) ?? 0) + 1);
  };
  /** @param {Rule} rule */
  const visitRule = (rule) => {
    reach(rule);
    const nested = records.metaOf(rule).block;
    if (nested) {
      walk(nested);
      return;
    }
    for (const node of rule.nodes) {
      if (node.type === 'decl') count(node);
    }
  };
  /** @param {BlockRecord} block */
  const walk = (block) => {
    for (const entry of block.children) {
      if (entry instanceof Slot) {
        for (const record of entry.rules) visitRule(record.node);
      } else if (entry instanceof BlockRecord) {
        reach(entry.node);
        walk(entry);
      } else {
        reach(entry);
        if (entry.type === 'decl') count(entry);
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
