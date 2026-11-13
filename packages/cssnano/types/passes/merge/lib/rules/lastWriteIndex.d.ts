import type { PropertyKeys } from '../../../ir/propertyTable.js';
import type { BlockRecords } from '../../../ir/blockRecords.js';
import type { BlockRecord, NodeEntry } from '../../../ir/blockRecord.js';
import type { RuleRecord } from '../../../ir/ruleRecord.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
/** @import {PropertyKeys} from '../../../ir/propertyTable.js' */
/** @import {BlockRecords} from '../../../ir/blockRecords.js' */
/** @import {BlockRecord, NodeEntry} from '../../../ir/blockRecord.js' */
/** @import {RuleRecord} from '../../../ir/ruleRecord.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/**
 * A table of the latest position at which each property was declared among
 * the children of one parent, visited in document order. It tells whether a
 * conflicting declaration appears after a given position, in time linear in
 * the number of longhands the property expands to. The answers match
 * `isConflictingProp`; the table only computes them faster.
 *
 * Writes are also grouped by the element they set, so a move to known
 * elements ignores writes to other elements: a writer whose element is
 * unknown counts for every move.
 *
 * Positions are chosen by the caller and increase in document order. A
 * declaration at position p does not count as appearing after p.
 */
export default class LastWriteIndex {
    #private;
    constructor();
    /**
     * @param {PropertyKeys} keys the keys of a declaration's property name
     * @param {number} position
     * @param {readonly string[] | null} [elements] element keys of the writing
     * rule, or null when they are unknown
     */
    record(keys: PropertyKeys, position: number, elements?: readonly string[] | null): void;
    /**
     * Record every write a child of the parent makes, under the element keys
     * `elementKeysOf` gives its rule. An at-rule that is not a conditional group rule is
     * a barrier, since moving anything across it is not known to preserve the
     * cascade.
     *
     * @param {BlockRecords} records the arena that holds the entries
     * @param {DeclarationRecord | RuleRecord | BlockRecord | NodeEntry} entry a
     * live entry of a block
     * @param {number} position
     * @return {void}
     */
    recordNode(records: BlockRecords, entry: DeclarationRecord | RuleRecord | BlockRecord | NodeEntry, position: number): void;
    /**
     * Whether a write after `position` conflicts with one of `declarations`,
     * counting only writes that can set an element in `elements`, the non-empty
     * element keys of the rules moving to `position`. Null counts every write.
     *
     * @param {DeclarationRecord[]} declarations
     * @param {number} position
     * @param {Iterable<string> | null} [elements]
     * @return {boolean}
     */
    conflictsSince(declarations: DeclarationRecord[], position: number, elements?: Iterable<string> | null): boolean;
    /**
     * `conflictsSince` for entries that move with their rules: rule records,
     * whose declarations take the keys `elementKeysOf` gives, and bare declarations,
     * which count every write. Unknown keys count every write.
     *
     * @param {BlockRecords} records
     * @param {(RuleRecord | DeclarationRecord)[]} entries
     * @param {number} position
     * @return {boolean}
     */
    conflictsSinceIn(records: BlockRecords, entries: (RuleRecord | DeclarationRecord)[], position: number): boolean;
    /**
     * Entries that moved to `position` are written there now: each rule record
     * writes its declarations under the element keys `elementKeysOf` gives it. Every
     * entry only ever moves forward, so a later write to the same property
     * is kept.
     *
     * @param {BlockRecords} records
     * @param {(RuleRecord | DeclarationRecord)[]} entries
     * @param {number} position
     */
    moveWrites(records: BlockRecords, entries: (RuleRecord | DeclarationRecord)[], position: number): void;
}
//# sourceMappingURL=lastWriteIndex.d.ts.map