/** @import {Reducer} from './host.js' */
import type { Reducer } from './host.js';
export type PlanNode = {
    /**
     * the node after each reducer
     */
    next: Map<Reducer, PlanNode>;
    /**
     * the plan that ends at this node
     */
    plan?: readonly Reducer[];
};
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
declare class PlanTable {
    #private;
    /**
     * @param {readonly Reducer[]} reducers a non-empty list
     * @returns {readonly Reducer[]} the plan for the list, the same object each time
     */
    intern(reducers: readonly Reducer[]): readonly Reducer[];
}
export { PlanTable };
//# sourceMappingURL=plans.d.ts.map