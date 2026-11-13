import type { PropertyKeys } from './propertyTable.js';
import type { TokenListId } from './tokenLists.js';
import type { ArenaIndex } from './blockRecord.js';
/** @import {PropertyKeys} from './propertyTable.js' */
/** @import {TokenListId} from './tokenLists.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
import { DECLARATION } from './blockRecord.js';
/**
 * One declaration of a merge run, with the facts its records keep. Rule
 * merging moves and removes declarations but never changes their property,
 * value or importance. The longhand rounds change them through
 * `commitDeclarations`, which sets `marked`.
 */
export declare class DeclarationRecord {
    /** @type {typeof DECLARATION} DECLARATION, which the window reads with the other records */
    kind: typeof DECLARATION;
    /** @type {ArenaIndex} the place of the record in the arena of a block's entries, -1 until added */
    index: ArenaIndex;
    /** @type {string | null} the whitespace before the declaration, as its node gives it at the build */
    before: string | null;
    /** @type {string} the property name as written */
    prop: string;
    /** @type {TokenListId} the value's list, which the run's value table gives; equal values share it */
    valueList: TokenListId;
    /** @type {boolean} whether the declaration is !important */
    important: boolean;
    /** @type {PropertyKeys} the keys of the property name */
    keys: PropertyKeys;
    /** @type {number} equal for declarations that print the same, within one run */
    id: number;
    /**
     * The text between the property and the value, as the node's raws give it,
     * or null when the node has none and the printer infers it.
     *
     * @type {string | null}
     */
    between: string | null;
    /**
     * The spelling of the important flag as the node's raws give it, or null when
     * the declaration is not important or the printer infers the flag.
     *
     * @type {string | null}
     */
    importantSpelling: string | null;
    /**
     * The features a browser must support for the declaration to apply, when the
     * merge derived it from another declaration. Null for a declaration the
     * author wrote.
     *
     * @type {ReadonlySet<string> | null}
     */
    inheritedSupport: ReadonlySet<string> | null;
    /**
     * The character that PostCSS's raw value keeps after the value, which a
     * trailing backslash can escape: null when the node keeps no raw past the
     * value, and '' when the raw does not start with the value.
     *
     * @type {string | null}
     */
    rawAfterValue: string | null;
    /**
     * Whether the value as written holds non-ASCII text when the value list is
     * the cleaned value, so a comment the list drops may hold that text alone.
     * The charset decision reads it; a declaration an edit made holds false.
     *
     * @type {boolean}
     */
    writtenNonAscii: boolean;
    /**
     * Whether an edit changed the declaration, so write-back must write it. The
     * build sets nothing.
     *
     * @type {boolean}
     */
    marked: boolean;
    /**
     * The arena index of the record whose raws a merged entry prints, or -1 for
     * an entry that keeps its own raws. Every record shape holds it.
     *
     * @type {number}
     */
    template: number;
    /**
     * @param {string | null} before
     * @param {string} prop
     * @param {TokenListId} valueList
     * @param {boolean} important
     * @param {PropertyKeys} keys
     * @param {number} id
     * @param {string | null} between
     * @param {string | null} importantSpelling
     */
    constructor(before: string | null, prop: string, valueList: TokenListId, important: boolean, keys: PropertyKeys, id: number, between: string | null, importantSpelling: string | null);
}
//# sourceMappingURL=declarationRecord.d.ts.map