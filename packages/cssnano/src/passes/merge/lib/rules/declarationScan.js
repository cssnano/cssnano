import { Slot } from './blockRecords.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';

/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecord as Block} from './blockRecord.js' */
/** @import {RuleLink} from './ruleSequence.js' */
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
    if (typeof entry === 'number') {
      const nested = /** @type {Block} */ (records.block(entry));
      if (
        !nested.dropped &&
        nested.node.type === 'atrule' &&
        hasDeclarationOutsideRules(records, nested)
      ) {
        return true;
      }
    } else if (entry instanceof DeclarationRecord) {
      return true;
    }
  }
  return false;
}

/**
 * True for a slot that holds no rule, or a block that a sweep emptied.
 *
 * @param {BlockRecords} records
 * @param {Slot | number | DeclarationRecord | ChildNode} entry
 * @return {boolean}
 */
function isEmptied(records, entry) {
  if (entry instanceof Slot) return entry.rules.length === 0;
  return typeof entry === 'number' && records.block(entry)?.remaining === 0;
}

/**
 * Walks the stylesheet in the order it will be written to find declarations
 * between two rules.
 */
export default class DeclarationScan {
  /** @type {BlockRecords} */
  #records;

  /**
   * @type {Map<Slot | number | DeclarationRecord | ChildNode, number>} for a slot that holds no
   * rule, or a block that left none, the index of a later sibling before which
   * no live node stands
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
   * @param {RuleLink} first
   * @param {RuleLink} second
   * @param {WeakMap<Block, boolean>} outsideDeclarations whether a rule has
   * a declaration outside its nested rules, valid for the whole scan: rewrites
   * move declarations between rules but never create one outside them
   * @return {boolean}
   */
  declarationBetween(first, second, outsideDeclarations) {
    /** @type {Block | undefined} */
    let enclosing = this.#records.block(first.slot.block);
    while (enclosing && enclosing.node.type !== 'rule') {
      enclosing = this.#records.block(enclosing.parent);
    }
    if (!enclosing) return false;
    let hasOutside = outsideDeclarations.get(enclosing);
    if (hasOutside === undefined) {
      hasOutside = hasDeclarationOutsideRules(this.#records, enclosing);
      outsideDeclarations.set(enclosing, hasOutside);
    }
    if (!hasOutside) return false;

    let block = /** @type {Block} */ (this.#records.block(first.slot.block));
    let index = first.slot.position;
    // The rules after `first` in its slot come next; `first` holds only
    // declarations and comments, so its own contents are skipped.
    let offset = first.slot.rules.indexOf(first.record.index) + 1;
    for (;;) {
      index = this.#skipEmptied(block, index);
      const entry = block.children[index];
      if (entry instanceof Slot) {
        if (entry.rules.includes(second.record.index, offset)) return false;
      } else if (typeof entry === 'number') {
        const nested = /** @type {Block} */ (this.#records.block(entry));
        if (nested.children.length > 0) {
          block = nested;
          index = 0;
          offset = 0;
          continue;
        }
      } else if (entry instanceof DeclarationRecord) {
        return true;
      } else if (!entry) {
        if (block === enclosing) return false;
        index = block.position;
        block = /** @type {Block} */ (this.#records.block(block.parent));
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
    let end = index;
    while (end < length) {
      const entry = children[end];
      if (!isEmptied(records, entry)) break;
      end = this.#skips.get(entry) ?? end + 1;
    }
    for (let at = index; at < end;) {
      const entry = children[at];
      const next = this.#skips.get(entry) ?? at + 1;
      this.#skips.set(entry, end);
      at = next;
    }
    return end;
  }
}
