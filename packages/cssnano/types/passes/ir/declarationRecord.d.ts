import type { Declaration } from 'postcss';
import type { DeclarationKeys } from './declarationKey.js';
import type { PropertyKeys, PropertyTable } from './propertyTable.js';
/**
 * One declaration of a merge run, held beside the PostCSS node it describes.
 * Rule merging moves and removes declarations but never changes their
 * property, value or importance, so these facts stay true for the record's
 * life.
 */
export declare class DeclarationRecord {
    /** @type {Declaration} the declaration the record describes */
    node: Declaration;
    /** @type {string} the property name as written */
    prop: string;
    /** @type {string} the value as written */
    value: string;
    /** @type {boolean} whether the declaration is !important */
    important: boolean;
    /** @type {PropertyKeys} the keys of the property name */
    keys: PropertyKeys;
    /** @type {number} equal for declarations that print the same, within one run */
    id: number;
    /** @type {number} the place of the record in the arena of a block's entries, -1 until added */
    index: number;
    /** @type {number} DECLARATION, which the window reads with the other records */
    kind: number;
    /** @type {string} '' for a declaration, which has no at-rule name */
    name: string;
    /** @type {string} '' for a declaration, which has no prelude */
    params: string;
    /** @type {boolean} false for a declaration, which is no layer */
    anonymous: boolean;
    /** @type {number} NO_PRELUDE for a declaration */
    preludeId: number;
    /**
     * @param {Declaration} node
     * @param {string} prop
     * @param {string} value
     * @param {boolean} important
     * @param {PropertyKeys} keys
     * @param {number} id
     */
    constructor(node: Declaration, prop: string, value: string, important: boolean, keys: PropertyKeys, id: number);
}
/**
 * The record of a declaration of the run's stylesheet.
 *
 * @param {Declaration} node
 * @param {PropertyTable} properties
 * @param {DeclarationKeys} declarations
 * @return {DeclarationRecord}
 */
export declare function recordDeclaration(node: Declaration, properties: PropertyTable, declarations: DeclarationKeys): DeclarationRecord;
//# sourceMappingURL=declarationRecord.d.ts.map