import { Slot } from './blockRecords.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';

const REFILLED = 'a skipped entry is no longer emptied';

/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecord as Block} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */

/**
 * True if a declaration of `block` or of an at-rule inside it, rather than of
 * a nested rule, exists. Only such declarations can separate two neighboring
 * rules.
 *
 * @param {BlockRecords} records
 * @param {Block} block
 * @return {boolean}
 */
function hasDeclarationOutsideRules(records, block) {
  for (const entry of block.children) {
    if (entry instanceof Slot) continue;
    const nested = records.blockEntry(entry);
    if (nested) {
      if (
        !nested.dropped &&
        nested.node.type === 'atrule' &&
        hasDeclarationOutsideRules(records, nested)
      ) {
        return true;
      }
    } else if (records.entry(entry) instanceof DeclarationRecord) {
      return true;
    }
  }
  return false;
}

/**
 * True for a slot that holds no rule, or a block that a sweep emptied.
 *
 * @param {BlockRecords} records
 * @param {Slot | number} entry
 * @return {boolean}
 */
function isEmptied(records, entry) {
  if (entry instanceof Slot) return entry.rules.length === 0;
  return records.blockEntry(entry)?.remaining === 0;
}

/**
 * Walks the stylesheet in the order it will be written to find declarations
 * between two rules.
 */
export default class DeclarationScan {
  /** @type {BlockRecords} */
  #records;

  /**
   * Per block index, the index of a later sibling before which no live entry
   * stands, for each position a skip has passed. Made at the first skip in a
   * block; a child appended later has no entry.
   *
   * @type {Map<number, number[]>}
   */
  #skips = new Map();

  /** @param {BlockRecords} records the arena that the blocks of the links index */
  constructor(records) {
    this.#records = records;
  }

  /**
   * True if a declaration outside both rules lies between them. CSS Nesting
   * keeps a declaration that follows nested rules in source order, so neither
   * rule may move across it. Neighbors hold no rule between them, so any such
   * declaration belongs to an enclosing rule or a block nested in it.
   *
   * The walk follows source order as the stylesheet will be written, which
   * differs from the stylesheet for rules that moved, and is short because it
   * starts at `first`.
   *
   * @param {RuleRecord} first
   * @param {RuleRecord} second
   * @param {Map<number, boolean>} outsideDeclarations whether a rule has
   * a declaration outside its nested rules, valid for the whole scan: rewrites
   * move declarations between rules but never create one outside them
   * @return {boolean}
   */
  declarationBetween(first, second, outsideDeclarations) {
    /** @type {Block | undefined} */
    let enclosing = this.#records.block(first.slotBlock);
    while (enclosing && enclosing.node.type !== 'rule') {
      enclosing = this.#records.block(enclosing.parent);
    }
    if (!enclosing) return false;
    let hasOutside = outsideDeclarations.get(enclosing.index);
    if (hasOutside === undefined) {
      hasOutside = hasDeclarationOutsideRules(this.#records, enclosing);
      outsideDeclarations.set(enclosing.index, hasOutside);
    }
    if (!hasOutside) return false;

    let block = /** @type {Block} */ (this.#records.block(first.slotBlock));
    let index = first.slotPosition;
    // The rules after `first` in its slot come next; `first` holds only
    // declarations and comments, so its own contents are skipped.
    let offset = this.#records.slotOf(first).rules.indexOf(first.index) + 1;
    for (;;) {
      index = this.#skipEmptied(block, index);
      const entry = block.children[index];
      if (entry instanceof Slot) {
        if (entry.rules.includes(second.index, offset)) return false;
      } else if (entry === undefined) {
        if (block === enclosing) return false;
        index = block.position;
        block = /** @type {Block} */ (this.#records.block(block.parent));
      } else if (this.#records.entry(entry) instanceof DeclarationRecord) {
        return true;
      } else {
        const nested = this.#records.blockEntry(entry);
        if (nested?.children.length) {
          block = nested;
          index = 0;
          offset = 0;
          continue;
        }
      }
      index++;
      offset = 0;
    }
  }

  /**
   * The index of the first entry at or after `index` that applies something.
   * A run of emptied slots and blocks is crossed once, then jumped, so a rule
   * that moved ahead of many of them does not walk across them again for
   * every neighbor. Nothing refills an emptied slot or block during a sweep,
   * which keeps a jump valid.
   *
   * @param {Block} block
   * @param {number} index
   * @return {number}
   */
  #skipEmptied(block, index) {
    const { children } = block;
    const { length } = children;
    const records = this.#records;
    let jumps = this.#skips.get(block.index);
    if (jumps === undefined) {
      jumps = [];
      this.#skips.set(block.index, jumps);
    }
    let end = index;
    while (end < length) {
      if (!isEmptied(records, children[end])) break;
      end = jumps[end] ?? end + 1;
    }
    if (consistencyChecksEnabled()) {
      for (let at = index; at < end; at++) {
        if (!isEmptied(records, children[at])) throw new Error(REFILLED);
      }
    }
    for (let at = index; at < end;) {
      const next = jumps[at] ?? at + 1;
      jumps[at] = end;
      at = next;
    }
    return end;
  }
}
