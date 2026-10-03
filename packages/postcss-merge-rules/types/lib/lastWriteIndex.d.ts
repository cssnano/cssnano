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
 * Answers "has a declaration that conflicts with this one been written since
 * position p?" for the children of one parent, visited in document order, in
 * time proportional to the largest longhand expansion. `isConflictingProp`
 * defines the relation; the index only has to give the same answers faster.
 *
 * Positions are caller-defined, increase in document order, and a write at
 * position p is not "since" p.
 */
export default function createLastWriteIndex(): {
    record: (declaration: {
        prop: string;
    }, position: number) => void;
    lastConflict: (declaration: {
        prop: string;
    }) => number;
    recordNode: (node: ChildNode, position: number) => void;
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
};
//# sourceMappingURL=lastWriteIndex.d.ts.map