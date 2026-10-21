import type { Container, Declaration } from 'postcss';
import type { BoxFamily } from './boxGroups.js';
import type { BoxGroup, BoxProperty } from './boxGroups.js';
export type BoxDeclarations = {
    group: BoxGroup;
    /**
     * - the properties of the group
     */
    decls: Declaration[];
    /**
     * - the normal and the
     * important lane, which also hold what may alias a property of the group
     */
    lanes: [Declaration[], Declaration[]];
    /**
     * - whether a physical property appears
     */
    physical: boolean;
    /**
     * - the flow-relative families that
     * appear
     */
    flow: Set<BoxFamily> | null;
};
/** @import {Container, Declaration} from 'postcss'; */
/** @import {BoxFamily} from './boxGroups.js'; */
/** @import {BoxGroup, BoxProperty} from './boxGroups.js'; */
/**
 * @typedef {object} BoxDeclarations What one run of a rule declares of a group.
 * @property {BoxGroup} group
 * @property {Declaration[]} decls - the properties of the group
 * @property {[Declaration[], Declaration[]]} lanes - the normal and the
 * important lane, which also hold what may alias a property of the group
 * @property {boolean} physical - whether a physical property appears
 * @property {Set<BoxFamily> | null} flow - the flow-relative families that
 * appear
 */
/**
 * A property of a group joins its lanes and its list of members; one that may
 * alias a member joins the lanes only, where it stops values moving across it.
 *
 * @param {{ boxes: Map<BoxGroup, BoxDeclarations> | null }} state
 * @param {Declaration} child
 * @param {BoxProperty | undefined} boxProperty
 * @param {BoxGroup} boxGroup
 * @param {number} laneIndex
 * @return {void}
 */
export declare function addBoxDeclaration(state: {
    boxes: Map<BoxGroup, BoxDeclarations> | null;
}, child: Declaration, boxProperty: BoxProperty | undefined, boxGroup: BoxGroup, laneIndex: number): void;
/**
 * @param {Container} rule
 * @param {BoxDeclarations} box
 * @param {import('../targetSupport.js').BoxSupport} support
 * @return {void}
 */
export declare function reduceBox(rule: Container, box: BoxDeclarations, support: import('../targetSupport.js').BoxSupport): void;
//# sourceMappingURL=boxReducer.d.ts.map