/** @import {PropertyKeys} from './propertyTable.js' */
import type { PropertyKeys } from './propertyTable.js';
/**
 * The latest position at which each property was declared: the answers match
 * `isConflictingProp`, in time linear in the number of longhands the property
 * expands to.
 */
export declare class PropertyWrites {
    #private;
    /**
     * @param {PropertyKeys} keys the keys of a declaration's property name
     * @param {number} position
     */
    record(keys: PropertyKeys, position: number): void;
    /**
     * Position of the newest write that conflicts with the property, or -1.
     *
     * @param {PropertyKeys} keys
     * @return {number}
     */
    lastConflict(keys: PropertyKeys): number;
}
//# sourceMappingURL=propertyWrites.d.ts.map