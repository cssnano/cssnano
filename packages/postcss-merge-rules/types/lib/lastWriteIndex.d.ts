import type { AtRule, ChildNode, Declaration } from 'postcss';
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
 * A table of the latest position at which each property was declared among
 * the children of one parent, visited in document order. It tells whether a
 * conflicting declaration appears after a given position, in time linear in
 * the number of longhands the property expands to. The answers match
 * `isConflictingProp`; the table only computes them faster.
 *
 * Positions are chosen by the caller and increase in document order. A
 * declaration at position p does not count as appearing after p.
 */
export default class LastWriteIndex {
    #private;
    /**
     * @param {{prop: string}} declaration
     * @param {number} position
     */
    record(declaration: {
        prop: string;
    }, position: number): void;
    /**
     * Record every write a child of the parent makes. An at-rule that is not a
     * conditional group rule is a barrier, since moving anything across it is
     * not known to preserve the cascade.
     *
     * @param {ChildNode} node
     * @param {number} position
     * @return {void}
     */
    recordNode(node: ChildNode, position: number): void;
    /**
     * Position of the newest write that conflicts with `declaration`, or -1.
     *
     * @param {{prop: string}} declaration
     * @return {number}
     */
    lastConflict(declaration: {
        prop: string;
    }): number;
    /**
     * @param {{prop: string}[]} declarations
     * @param {number} position
     * @return {boolean}
     */
    conflictsSince(declarations: {
        prop: string;
    }[], position: number): boolean;
    /**
     * Declarations that moved to `position` are written there now. Every
     * entry only ever moves forward, so a later write to the same property
     * is kept.
     *
     * @param {{prop: string}[]} declarations
     * @param {number} position
     */
    moveWrites(declarations: {
        prop: string;
    }[], position: number): void;
}
//# sourceMappingURL=lastWriteIndex.d.ts.map