import type { PropertyKeys } from './propertyTable.js';
import type { ArenaIndex } from '../merge/lib/rules/blockRecord.js';
/** @import {PropertyKeys} from './propertyTable.js' */
/** @import {ArenaIndex} from '../merge/lib/rules/blockRecord.js' */
import { DECLARATION } from '../merge/lib/rules/blockRecord.js';
/**
 * One declaration of a merge run, with the facts its records keep.
 * Rule merging moves and removes declarations but never changes their
 * property, value or importance, so these facts stay true for the record's
 * life.
 */
export declare class DeclarationRecord {
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
    /** @type {ArenaIndex} the place of the record in the arena of a block's entries, -1 until added */
    index: ArenaIndex;
    /** @type {typeof DECLARATION} DECLARATION, which the window reads with the other records */
    kind: typeof DECLARATION;
    /** @type {string} '' for a declaration, which has no at-rule name */
    name: string;
    /** @type {string} '' for a declaration, which has no prelude */
    params: string;
    /** @type {boolean} false for a declaration, which is no layer */
    anonymous: boolean;
    /** @type {number} NO_PRELUDE for a declaration */
    preludeId: number;
    /** @type {string | null} the whitespace before the declaration, as its node gives it at the build */
    before: string | null;
    /**
     * @param {string} prop
     * @param {string} value
     * @param {boolean} important
     * @param {PropertyKeys} keys
     * @param {number} id
     */
    constructor(prop: string, value: string, important: boolean, keys: PropertyKeys, id: number);
}
//# sourceMappingURL=declarationRecord.d.ts.map