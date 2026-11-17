import type { BlockDeclarations } from '../blockDeclarations.js';
import type { BoxFamily } from './boxGroups.js';
import type { BoxGroup, BoxProperty } from './boxGroups.js';
export type BoxDeclarations = {
    group: BoxGroup;
    /**
     * - positions of the properties of the group
     */
    decls: number[];
    /**
     * - the positions of the normal and the
     * important lane, which also hold what may alias a property of the group
     */
    lanes: [number[], number[]];
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
/** @import {BlockDeclarations, DeclarationItem} from '../blockDeclarations.js'; */
/** @import {BoxFamily} from './boxGroups.js'; */
/** @import {BoxGroup, BoxProperty} from './boxGroups.js'; */
/**
 * @typedef {object} BoxDeclarations What one run of a rule declares of a group.
 * @property {BoxGroup} group
 * @property {number[]} decls - positions of the properties of the group
 * @property {[number[], number[]]} lanes - the positions of the normal and the
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
 * @param {number} child - the position of the declaration in its list
 * @param {BoxProperty | undefined} boxProperty
 * @param {BoxGroup} boxGroup
 * @param {number} laneIndex
 * @return {void}
 */
export declare function addBoxDeclaration(state: {
    boxes: Map<BoxGroup, BoxDeclarations> | null;
}, child: number, boxProperty: BoxProperty | undefined, boxGroup: BoxGroup, laneIndex: number): void;
/**
 * @param {BlockDeclarations} list
 * @param {BoxDeclarations} box
 * @param {import('../targetSupport.js').BoxSupport} support
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export declare function reduceBox(list: BlockDeclarations, box: BoxDeclarations, support: import('../targetSupport.js').BoxSupport, features: ReadonlySet<string>): void;
//# sourceMappingURL=boxReducer.d.ts.map