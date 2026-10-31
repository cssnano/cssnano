import { BlockRecord } from './blockRecords.js';
import { RuleRecord } from './ruleRecord.js';
import type { AtRule, ChildNode, Declaration } from 'postcss';
import type { PropertyTable } from '../../../ir/propertyTable.js';
/**
 * @param {ChildNode} node
 * @return {node is AtRule}
 */
export declare function isConditionalGroupRule(node: ChildNode): node is AtRule;
/**
 * The latest position at which each property was declared, for one property
 * table: the answers match `isConflictingProp`, in time linear in the number
 * of longhands the property expands to.
 */
export declare class PropertyWrites {
    #private;
    /** @param {PropertyTable} table keys every declaration this index sees */
    constructor(table: PropertyTable);
    /**
     * @param {{prop: string}} declaration
     * @param {number} position
     */
    record(declaration: {
        prop: string;
    }, position: number): void;
    /**
     * Position of the newest write that conflicts with `declaration`, or -1.
     *
     * @param {{prop: string}} declaration
     * @return {number}
     */
    lastConflict(declaration: {
        prop: string;
    }): number;
}
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
    /** @param {PropertyTable} table keys every declaration this index sees */
    constructor(table: PropertyTable);
    /**
     * @param {{prop: string}} declaration
     * @param {number} position
     * @param {readonly string[] | null} [keys] element keys of the writing rule,
     * or null when they are unknown
     */
    record(declaration: {
        prop: string;
    }, position: number, keys?: readonly string[] | null): void;
    /**
     * Record every write a child of the parent makes, under the element keys
     * `keysOf` gives its rule. An at-rule that is not a conditional group rule is
     * a barrier, since moving anything across it is not known to preserve the
     * cascade.
     *
     * @param {ChildNode | RuleRecord | BlockRecord} entry the node, or the record
     * of a rule or of an at-rule with a block, as `BlockRecords#entryOf` gives
     * @param {number} position
     * @param {(record: RuleRecord) => string[] | null} keysOf
     * @return {void}
     */
    recordNode(entry: ChildNode | RuleRecord | BlockRecord, position: number, keysOf: (record: RuleRecord) => string[] | null): void;
    /**
     * Whether a write after `position` conflicts with one of `declarations`,
     * counting only writes that can set an element in `elements`, the non-empty
     * element keys of the rules moving to `position`. Null counts every write.
     *
     * @param {{prop: string}[]} declarations
     * @param {number} position
     * @param {Iterable<string> | null} [elements]
     * @return {boolean}
     */
    conflictsSince(declarations: {
        prop: string;
    }[], position: number, elements?: Iterable<string> | null): boolean;
    /**
     * `conflictsSince` for entries that move with their rules: rule records,
     * whose declarations take the keys `keysOf` gives, and bare declarations,
     * which count every write. Unknown keys count every write.
     *
     * @param {(RuleRecord | Declaration)[]} entries
     * @param {number} position
     * @param {(record: RuleRecord) => string[] | null} keysOf
     * @return {boolean}
     */
    conflictsSinceIn(entries: (RuleRecord | Declaration)[], position: number, keysOf: (record: RuleRecord) => string[] | null): boolean;
    /**
     * Entries that moved to `position` are written there now: each rule record
     * writes its declarations under the element keys `keysOf` gives it. Every
     * entry only ever moves forward, so a later write to the same property
     * is kept.
     *
     * @param {(RuleRecord | Declaration)[]} entries
     * @param {number} position
     * @param {(record: RuleRecord) => string[] | null} keysOf
     */
    moveWrites(entries: (RuleRecord | Declaration)[], position: number, keysOf: (record: RuleRecord) => string[] | null): void;
}
//# sourceMappingURL=lastWriteIndex.d.ts.map