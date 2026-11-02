import { DeclarationRecord } from '../../../ir/declarationRecord.js';

/** @import {BlockRecord} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @typedef {BlockRecord | RuleRecord} Container */
/** @import {BlockRecords} from './blockRecords.js' */

/**
 * True if a declaration of `block` or of an at-rule inside it, rather than of
 * a nested rule, exists. Only such declarations can separate two neighboring
 * rules.
 *
 * @param {BlockRecords} records
 * @param {Container} block
 * @return {boolean}
 */
function hasDeclarationOutsideRules(records, block) {
  for (
    let entry = records.links.firstChild(block.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    if (records.entry(entry) instanceof DeclarationRecord) return true;
    const nested = records.blockEntry(entry);
    if (nested && hasDeclarationOutsideRules(records, nested)) return true;
  }
  return false;
}

/**
 * Walks the stylesheet in the order it will be written to find declarations
 * between two rules.
 */
export default class DeclarationScan {
  /** @type {BlockRecords} */
  #records;

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
   * The walk follows the chains from `first`, which is the source order the
   * stylesheet will be written in, though rules that moved may differ from
   * the stylesheet. A nested rule's own block is not in a chain, so the walk
   * does not enter it.
   *
   * @param {RuleRecord} first
   * @param {RuleRecord} second
   * @param {Map<number, boolean>} outsideDeclarations whether a rule has
   * a declaration outside its nested rules, valid for the whole scan: rewrites
   * move declarations between rules but never create one outside them
   * @return {boolean}
   */
  declarationBetween(first, second, outsideDeclarations) {
    const { links } = this.#records;
    /** @type {Container | undefined} */
    let enclosing = links.enclosingContainer(first.index);
    while (enclosing && enclosing.node.type !== 'rule') {
      enclosing = links.enclosingContainer(enclosing.index);
    }
    if (!enclosing) return false;
    let hasOutside = outsideDeclarations.get(enclosing.index);
    if (hasOutside === undefined) {
      hasOutside = hasDeclarationOutsideRules(this.#records, enclosing);
      outsideDeclarations.set(enclosing.index, hasOutside);
    }
    if (!hasOutside) return false;

    // `first` holds only declarations and comments in its own block, so the
    // walk starts at the entry after it, in the block that holds it.
    let holder = /** @type {Container} */ (
      links.enclosingContainer(first.index)
    );
    let entry = links.nextSibling(first.index);
    for (;;) {
      if (entry === -1) {
        if (holder === enclosing) return false;
        // The walk leaves an at-rule block, which is in a chain, for the entry after it.
        entry = links.nextSibling(holder.index);
        holder = /** @type {Container} */ (
          links.enclosingContainer(holder.index)
        );
        continue;
      }
      if (entry === second.index) return false;
      const item = this.#records.entry(entry);
      if (item instanceof DeclarationRecord) return true;
      const nested = this.#records.blockEntry(entry);
      if (nested && nested.first !== -1) {
        holder = nested;
        entry = nested.first;
      } else {
        entry = links.nextSibling(entry);
      }
    }
  }
}
