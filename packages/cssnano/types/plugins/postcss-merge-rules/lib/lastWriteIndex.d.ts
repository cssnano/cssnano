import type { AtRule, ChildNode, Declaration, Rule } from 'postcss';
export type PropertyKeys = {
    custom: true;
    key: string;
} | {
    custom: false;
    all: true;
} | {
    custom: false;
    all: false;
    name: string;
    known: boolean;
    subjectToAll: boolean;
    longhands: {
        name: string;
        side: string | undefined;
        opposite: string | undefined;
    }[];
    lead: string;
    length: number;
    bare: string;
};
/**
 * @param {ChildNode} node
 * @return {node is AtRule}
 */
export declare function isConditionalGroupRule(node: ChildNode): node is AtRule;
/**
 * True if the subtree holds an at-rule whose position in the cascade is not
 * modelled, so its declarations cannot be reasoned about as plain writes.
 *
 * @param {ChildNode} node
 * @return {boolean}
 */
export declare function isOpaque(node: ChildNode): boolean;
/**
 * The declarations of a rule or conditional group rule, at any depth.
 *
 * @param {ChildNode} node
 * @return {Declaration[]}
 */
export declare function collectDeclarations(node: ChildNode): Declaration[];
/**
 * The latest position at which each property was declared, for one property
 * table: the answers match `isConflictingProp`, in time linear in the number
 * of longhands the property expands to.
 */
export declare class PropertyWrites {
    #private;
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
     * @param {ChildNode} node
     * @param {number} position
     * @param {(rule: Rule) => string[] | null} keysOf
     * @return {void}
     */
    recordNode(node: ChildNode, position: number, keysOf: (rule: Rule) => string[] | null): void;
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
     * `conflictsSince` for declarations that move with their rules, whose
     * elements are the union of the keys `keysOf` gives their rules. A
     * declaration with unknown elements counts every write.
     *
     * @param {Declaration[]} declarations
     * @param {number} position
     * @param {(rule: Rule) => string[] | null} keysOf
     * @return {boolean}
     */
    conflictsSinceIn(declarations: Declaration[], position: number, keysOf: (rule: Rule) => string[] | null): boolean;
    /**
     * Declarations that moved to `position` are written there now. Every
     * entry only ever moves forward, so a later write to the same property
     * is kept.
     *
     * @param {Declaration[]} declarations
     * @param {number} position
     * @param {(rule: Rule) => string[] | null} keysOf
     */
    moveWrites(declarations: Declaration[], position: number, keysOf: (rule: Rule) => string[] | null): void;
}
//# sourceMappingURL=lastWriteIndex.d.ts.map