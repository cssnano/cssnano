/** @import {ChildNode, Container, Rule} from 'postcss' */

/**
 * The scan decides merges on a sequence of rules and writes the stylesheet
 * once per sweep. Everything that is not a rule it can rewrite keeps its
 * place while it decides: containers, declarations of enclosing rules,
 * comments. Each rule stands in a slot, a position among the children of one
 * container, and a merge only changes which rules stand in the slots of the
 * pair it replaces. A node between the pair therefore stays between the
 * replacements. Splicing the children of a container after every merge would
 * take quadratic time.
 *
 * @typedef {object} Slot
 * @property {Container} parent
 * @property {number} index where the slot stands among `parent.nodes`, or
 * after the last child when a rule moved into `parent` created it
 * @property {Rule[]} rules in stylesheet order, none once its rule left
 */

/**
 * What collaborators may use: they look slots up but cannot move rules.
 *
 * @typedef {Pick<SlotIndex, 'slotAt' | 'length' | 'positionOf' | 'childrenOf'>} SlotReader
 */

/**
 * Where each rule of the stylesheet stands, as the sweep started, and which
 * slots rules moved into.
 */
export default class SlotIndex {
  /** @type {Map<Rule, Slot>} the slot of each rule of the stylesheet */
  #slots = new Map();

  /**
   * @type {Map<Container, number>} where each container with children stands
   * among the children of its parent. Containers do not move during a sweep,
   * so the index stays valid and spares a search of the parent.
   */
  #positions = new Map();

  /** @type {Map<Container, Slot[]>} slots of rules that moved into a container, in the order they moved */
  #appended = new Map();

  /**
   * @param {Container} container
   * @param {number} index
   * @param {Rule} rule
   * @return {Slot}
   */
  register(container, index, rule) {
    /** @type {Slot} */
    const slot = { parent: container, index, rules: [rule] };
    this.#slots.set(rule, slot);
    return slot;
  }

  /**
   * @param {Container} container
   * @param {number} index
   */
  recordPosition(container, index) {
    this.#positions.set(container, index);
  }

  /**
   * @param {Container} container
   * @return {number}
   */
  positionOf(container) {
    return /** @type {number} */ (this.#positions.get(container));
  }

  /**
   * @param {Container} container
   * @param {number} index
   * @return {Slot | undefined} the slot standing at `index` among the children
   * of `container`, where the slots of moved rules follow the last child
   */
  slotAt(container, index) {
    const children = /** @type {ChildNode[]} */ (container.nodes);
    const node = children[index];
    return node
      ? this.#slots.get(/** @type {Rule} */ (node))
      : this.#appended.get(container)?.[index - children.length];
  }

  /**
   * @param {Container} container
   * @return {number} the children of `container` plus the slots moved into it
   */
  length(container) {
    return (
      /** @type {ChildNode[]} */ (container.nodes).length +
      (this.#appended.get(container)?.length ?? 0)
    );
  }

  /**
   * @param {Container} container
   * @param {(node: ChildNode) => boolean} keepsNode whether a child that holds
   * no slot is written
   * @return {ChildNode[]} the children `container` has now, in order
   */
  childrenOf(container, keepsNode) {
    /** @type {ChildNode[]} */
    const children = [];
    for (const node of /** @type {ChildNode[]} */ (container.nodes)) {
      const slot = this.#slots.get(/** @type {Rule} */ (node));
      if (slot) children.push(...slot.rules);
      else if (keepsNode(node)) children.push(node);
    }
    for (const slot of this.#appended.get(container) ?? []) {
      children.push(...slot.rules);
    }
    return children;
  }

  /**
   * Moves `rule` out of `from` into a new slot after the last child of
   * `target`.
   *
   * @param {Rule} rule
   * @param {Slot} from
   * @param {Container} target
   * @return {Slot} the slot that now holds `rule`
   */
  moveRule(rule, from, target) {
    from.rules = from.rules.filter((candidate) => candidate !== rule);
    let slots = this.#appended.get(target);
    if (!slots) {
      slots = [];
      this.#appended.set(target, slots);
    }
    /** @type {Slot} */
    const slot = {
      parent: target,
      index: /** @type {ChildNode[]} */ (target.nodes).length + slots.length,
      rules: [rule],
    };
    slots.push(slot);
    return slot;
  }

  /**
   * @param {Slot} slot
   * @param {Rule} rule the rule that stands in `slot` and is replaced
   * @param {Rule[]} replacements
   */
  substitute(slot, rule, replacements) {
    slot.rules.splice(slot.rules.indexOf(rule), 1, ...replacements);
  }
}
