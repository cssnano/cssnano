/** @import {ChildNode, Container} from 'postcss' */
/** @import {RuleLink} from './ruleSequence.js' */
/** @import {Slot, SlotReader} from './slotIndex.js' */
/** @import {BlockReader} from './droppableBlocks.js' */

/**
 * True if a declaration of `container` or of an at-rule inside it, rather
 * than of a nested rule, exists. Only such declarations can separate two
 * neighboring rules.
 *
 * @param {Container} container
 * @return {boolean}
 */
function hasDeclarationOutsideRules(container) {
  return (container.nodes ?? []).some(
    (node) =>
      node.type === 'decl' ||
      (node.type === 'atrule' && hasDeclarationOutsideRules(node))
  );
}

/**
 * Walks the stylesheet in the order it will be written to find declarations
 * between two rules.
 */
export default class DeclarationScan {
  #slots;

  #blocks;

  /**
   * @type {Map<Slot | ChildNode, number>} for a slot that holds no rule, or a
   * block that left none, the index of a later sibling before which no live
   * node stands
   */
  #skips = new Map();

  /**
   * @param {SlotReader} slots
   * @param {BlockReader} blocks
   */
  constructor(slots, blocks) {
    this.#slots = slots;
    this.#blocks = blocks;
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
   * @param {WeakMap<Container, boolean>} outsideDeclarations whether a rule has
   * a declaration outside its nested rules, valid for the whole scan: rewrites
   * move declarations between rules but never create one outside them
   * @return {boolean}
   */
  declarationBetween(first, second, outsideDeclarations) {
    /** @type {Container | undefined} */
    let enclosing = first.slot.parent;
    while (enclosing && enclosing.type !== 'rule') {
      enclosing = /** @type {Container | undefined} */ (enclosing.parent);
    }
    if (!enclosing) return false;
    let hasOutside = outsideDeclarations.get(enclosing);
    if (hasOutside === undefined) {
      hasOutside = hasDeclarationOutsideRules(enclosing);
      outsideDeclarations.set(enclosing, hasOutside);
    }
    if (!hasOutside) return false;

    let container = first.slot.parent;
    let index = first.slot.index;
    // The rules after `first` in its slot come next; `first` holds only
    // declarations and comments, so its own contents are skipped.
    let offset = first.slot.rules.indexOf(first.rule) + 1;
    for (;;) {
      const children = /** @type {ChildNode[]} */ (container.nodes);
      index = this.#skipEmptied(container, index);
      const node = children[index];
      const slot = this.#slots.slotAt(container, index);
      if (slot) {
        if (slot.rules.includes(second.rule, offset)) return false;
      } else if (node) {
        if (node.type === 'decl') return true;
        if ('nodes' in node && node.nodes?.length) {
          container = node;
          index = 0;
          offset = 0;
          continue;
        }
      } else if (container === enclosing) {
        return false;
      } else {
        const parent = /** @type {Container} */ (container.parent);
        index = this.#slots.positionOf(container);
        container = parent;
      }
      index++;
      offset = 0;
    }
  }

  /**
   * The index of the first sibling at or after `index` that applies
   * something. A run of emptied blocks and slots is crossed once, then
   * jumped, so a rule that moved ahead of many of them does not walk across
   * them again for every neighbor. Nothing refills an emptied slot or block
   * during a sweep, which keeps a jump valid.
   *
   * @param {Container} container
   * @param {number} index
   * @return {number}
   */
  #skipEmptied(container, index) {
    const children = /** @type {ChildNode[]} */ (container.nodes);
    const length = this.#slots.length(container);
    /** @param {number} at */
    const keyAt = (at) => this.#slots.slotAt(container, at) ?? children[at];
    /** @param {Slot | ChildNode} key */
    const isEmptied = (key) =>
      'rules' in key ? key.rules.length === 0 : this.#blocks.isEmptied(key);
    let end = index;
    while (end < length) {
      const key = keyAt(end);
      if (!isEmptied(key)) break;
      end = this.#skips.get(key) ?? end + 1;
    }
    for (let at = index; at < end;) {
      const key = keyAt(at);
      const next = this.#skips.get(key) ?? at + 1;
      this.#skips.set(key, end);
      at = next;
    }
    return end;
  }
}
