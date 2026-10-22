/** @import {Reducer} from './host.js' */

/**
 * @typedef {object} PlanNode
 * @property {Map<Reducer, PlanNode>} next the node after each reducer
 * @property {readonly Reducer[]} [plan] the plan that ends at this node
 */

/**
 * The plans of one run. A plan is the reducers that a property runs, in
 * pipeline order. A trie keyed by reducer identity gives each list one plan
 * object, so properties whose reducers match share the plan and its results.
 */
class PlanTable {
  /** @type {PlanNode} */
  #root = { next: new Map() };

  /**
   * @param {readonly Reducer[]} reducers a non-empty list
   * @returns {readonly Reducer[]} the plan for the list, the same object each time
   */
  intern(reducers) {
    let node = this.#root;
    for (const reducer of reducers) {
      let next = node.next.get(reducer);
      if (next === undefined) {
        next = { next: new Map() };
        node.next.set(reducer, next);
      }
      node = next;
    }
    node.plan ??= Object.freeze([...reducers]);
    return node.plan;
  }
}

export { PlanTable };
