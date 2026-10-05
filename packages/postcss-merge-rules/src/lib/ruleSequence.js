import DeclarationScan from './declarationScan.js';
import DroppableBlocks from './droppableBlocks.js';
import SlotIndex from './slotIndex.js';

/** @import {ChildNode, Container, Root, Rule} from 'postcss' */
/** @import {Slot} from './slotIndex.js' */

/**
 * A doubly linked list lets the scan replace a merged pair in constant time.
 *
 * @typedef {{rule: Rule, slot: Slot, prev: RuleLink | null, next: RuleLink | null}} RuleLink
 */

/**
 * The rules that stand in the slots of a pair after it is merged.
 *
 * @typedef {object} Placement
 * @property {Rule[]} first replaces the earlier rule, in its slot
 * @property {Rule[]} second replaces the later rule, in its slot
 */

/**
 * Gives a rule that is not in the stylesheet yet the parent it will have, so
 * that stringifying it infers missing raws, such as the last semicolon, from
 * the stylesheet. PostCSS infers them only for a rule that has a parent.
 *
 * The parent does not list the rule among its children. Until the sequence is
 * written, such a rule may only be stringified: `remove()`, `next()` and
 * `parent.index()` would misbehave on it.
 *
 * @param {Rule} rule
 * @param {Container | undefined} container
 * @return {void}
 */
export function standInContainer(rule, container) {
  rule.parent ??= /** @type {NonNullable<Rule['parent']>} */ (container);
}

/**
 * Chains a link for each rule, in order, after `previous`.
 *
 * @param {RuleLink} previous
 * @param {Rule[]} rules
 * @param {Slot} slot
 * @return {RuleLink} the last link, or `previous` when there are no rules
 */
function linkAfter(previous, rules, slot) {
  let tail = previous;
  for (const rule of rules) {
    /** @type {RuleLink} */
    const link = { rule, slot, prev: tail, next: null };
    tail.next = link;
    tail = link;
  }
  return tail;
}

/**
 * Every rule of a stylesheet in stylesheet order, including rules nested in
 * other rules, rewritten in place and written back once.
 */
export default class RuleSequence {
  /** @type {RuleLink} a sentinel that precedes the first rule */
  head = /** @type {RuleLink} */ ({ prev: null, next: null });

  #slots = new SlotIndex();

  #blocks = new DroppableBlocks();

  #scan = new DeclarationScan(this.#slots, this.#blocks);

  /** @type {Set<Container>} containers whose rules differ from the stylesheet */
  #changed = new Set();

  /** @param {Root} root */
  constructor(root) {
    let tail = this.head;
    /** @param {Container} container */
    const collect = (container) => {
      for (const [index, node] of /** @type {ChildNode[]} */ (
        container.nodes
      ).entries()) {
        if (node.type === 'rule') {
          /** @type {RuleLink} */
          const link = {
            rule: node,
            slot: this.#slots.register(container, index, node),
            prev: tail,
            next: null,
          };
          tail.next = link;
          tail = link;
        }
        if ('nodes' in node && node.nodes) {
          this.#blocks.register(node);
          this.#slots.recordPosition(node, index);
          collect(node);
        }
      }
    };
    collect(root);
  }

  /**
   * @param {RuleLink} first
   * @param {RuleLink} second
   * @param {WeakMap<Container, boolean>} outsideDeclarations see
   * `DeclarationScan#declarationBetween`
   * @return {boolean} whether a declaration outside both rules lies between them
   */
  declarationBetween(first, second, outsideDeclarations) {
    return this.#scan.declarationBetween(first, second, outsideDeclarations);
  }

  /**
   * Moves the rule of `second` to the end of the parent of `first`. It follows
   * `first` and holds no nested rules, so passing the rest of that parent
   * leaves the order of the rules unchanged.
   *
   * @param {RuleLink} first
   * @param {RuleLink} second
   * @return {boolean} whether the parents differed
   */
  moveIntoParent(first, second) {
    const target = first.slot.parent;
    const source = second.slot.parent;
    if (target === source) return false;
    this.#blocks.moved(source, target);
    second.slot = this.#slots.moveRule(second.rule, second.slot, target);
    this.#changed.add(target).add(source);
    return true;
  }

  /**
   * Replaces the pair `first` and the link after it with the `placement` rules.
   *
   * @param {RuleLink} first
   * @param {Placement} placement
   * @return {RuleLink} the link of the first replacement
   */
  replacePair(first, placement) {
    const second = /** @type {RuleLink} */ (first.next);
    const before = /** @type {RuleLink} */ (first.prev);
    const after = second.next;
    const firstSlot = first.slot;
    const secondSlot = second.slot;
    // Both rules may share a slot after an earlier partial merge, so each is
    // replaced where it stands.
    this.#blocks.changed(firstSlot.parent, placement.first.length - 1);
    this.#blocks.changed(secondSlot.parent, placement.second.length - 1);
    this.#slots.substitute(firstSlot, first.rule, placement.first);
    this.#slots.substitute(secondSlot, second.rule, placement.second);
    for (const rule of placement.first)
      standInContainer(rule, firstSlot.parent);
    for (const rule of placement.second) {
      standInContainer(rule, secondSlot.parent);
    }
    this.#changed.add(firstSlot.parent).add(secondSlot.parent);

    const tail = linkAfter(
      linkAfter(before, placement.first, firstSlot),
      placement.second,
      secondSlot
    );
    tail.next = after;
    if (after) after.prev = tail;
    return /** @type {RuleLink} */ (before.next);
  }

  /**
   * Writes the sequence into the stylesheet, rebuilding each changed container
   * once from its children and the rules now in its slots.
   *
   * @return {void}
   */
  write() {
    // A block which has become empty can be safely ignored, but keeping it would
    // make every later pair walk across it. Rebuild its parent without it,
    // which avoids searching the children of the parent once per removed
    // block.
    const emptied = this.#blocks.emptiedBlocks();
    const changed = new Set(this.#changed);
    for (const container of emptied) {
      const parent = /** @type {Container} */ (container.parent);
      if (!emptied.has(parent)) changed.add(parent);
      changed.delete(container);
    }
    // Every container is emptied before any is refilled, so a rule that moves
    // between two of them keeps the parent the refill gives it.
    const rebuilt = Array.from(changed, (container) => ({
      container,
      children: this.#slots.childrenOf(
        container,
        (node) => !emptied.has(/** @type {Container} */ (node))
      ),
      head: /** @type {ChildNode[]} */ (container.nodes)[0],
    }));
    for (const { container } of rebuilt) container.removeAll();
    for (const { container, children, head } of rebuilt) {
      // A rule made by a rewrite has the parent it was stringified with.
      for (const node of children) node.parent = undefined;
      container.append(children);
      // Removing the first child of a root hands its whitespace to the next.
      if (
        container.type === 'root' &&
        children.length &&
        children[0] !== head
      ) {
        children[0].raws.before = head.raws.before;
      }
    }
  }
}
