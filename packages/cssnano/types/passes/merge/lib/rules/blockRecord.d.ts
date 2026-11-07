/** @import {ChildNode, Container} from 'postcss' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
import type { ChildNode, Container } from 'postcss';
export declare const STYLESHEET = 0;
export declare const RULE = 1;
export declare const DECLARATION = 2;
export declare const COMMENT = 3;
export declare const CONDITIONAL_GROUP = 4;
export declare const LAYER = 5;
export declare const KEYFRAMES = 6;
export declare const IMPORT = 7;
export declare const OTHER_AT_RULE = 8;
export type ArenaIndex = number & {
    readonly brand: unique symbol;
};
export type ChainPosition = number & {
    readonly brand: unique symbol;
};
/**
 * The place of an entry in the arena of a run's records. It stays the same
 * while the entry moves between chains, unlike its chain position.
 *
 * @typedef {number & {readonly brand: unique symbol}} ArenaIndex
 */
/**
 * The place of an entry in the ordered children read from a chain, counted
 * from 0. It changes whenever an entry before it is linked or unlinked.
 *
 * @typedef {number & {readonly brand: unique symbol}} ChainPosition
 */
/** The id of an entry that has no prelude. */
export declare const NO_PRELUDE = -1;
/**
 * The kind of an at-rule from its folded name. Conditional groups hold rules
 * whose declarations cascade as they do at the top level. A keyframes is any
 * name that contains `keyframes`, vendor prefixes included.
 *
 * @param {string} name the name, folded by `asciiLowerCase`
 * @return {number} one of the at-rule kinds
 */
export declare function atRuleKind(name: string): number;
/**
 * @param {number} kind
 * @return {boolean} whether the kind is one of an at-rule
 */
export declare function isAtRuleKind(kind: number): boolean;
/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. Its children are the
 * entries its chain links, which `BlockRecords` keeps. Every record class holds
 * the same facts, with neutral values where they do not apply.
 */
export declare class BlockRecord {
    /** @type {Container} */
    node: Container;
    /** @type {number} what the block is, one of the kinds of this module */
    kind: number;
    /** @type {string} the folded name of an at-rule, '' for the stylesheet */
    name: string;
    /** @type {string} the prelude of an at-rule, '' for the stylesheet */
    params: string;
    /** @type {boolean} whether the block is a layer with no name, or only comments as its prelude */
    anonymous: boolean;
    /** @type {number} the interned id of the at-rule's prelude, or NO_PRELUDE */
    preludeId: number;
    /**
     * The whitespace before the block, as its node's `raws.before` gives it at
     * the build, or null when the node has none and the printer infers it;
     * write-back assigns the value a merge gives the record.
     *
     * @type {string | null}
     */
    before: string | null;
    /** @type {boolean} whether the block applies nothing once it is empty */
    droppable: boolean;
    /** @type {ArenaIndex} the place of the block in the arena of its records, -1 until added */
    index: ArenaIndex;
    /**
     * The id of the circumstances under which the block applies its content, as
     * `containerContext` gives it. A block moves only between equal containers,
     * so the id holds for the whole run.
     *
     * @type {number}
     */
    context: number;
    /**
     * The whitespace before the first child of the stylesheet, which PostCSS
     * hands on when that child is removed. Only the record of the stylesheet
     * holds it.
     *
     * @type {string | null}
     */
    leadingWhitespace: string | null;
    /**
     * @param {Container} node
     * @param {number} kind
     * @param {string} name the folded name, or ''
     * @param {string} params the prelude, or ''
     * @param {boolean} anonymous
     * @param {number} preludeId
     */
    constructor(node: Container, kind: number, name: string, params: string, anonymous: boolean, preludeId: number);
}
/**
 * A child of a block that is neither a rule, an at-rule with a block, nor a
 * declaration: a comment or a statement at-rule. It takes an index in the arena
 * so that a block's children hold indices alone.
 */
export declare class NodeEntry {
    /** @type {ChildNode} the node the entry stands for */
    node: ChildNode;
    /** @type {ArenaIndex} the place of the entry in the arena, -1 until added */
    index: ArenaIndex;
    /** @type {number} what the entry is, a comment or an at-rule kind */
    kind: number;
    /** @type {string} the folded name of an at-rule, '' for a comment */
    name: string;
    /** @type {string} the prelude of an at-rule, '' for a comment */
    params: string;
    /** @type {boolean} whether a layer statement is anonymous */
    anonymous: boolean;
    /** @type {number} the interned id of the at-rule's prelude, or NO_PRELUDE */
    preludeId: number;
    /** @type {string | null} the whitespace before the node, see `BlockRecord#before` */
    before: string | null;
    /**
     * @param {ChildNode} node
     * @param {number} kind
     * @param {string} name
     * @param {string} params
     * @param {boolean} anonymous
     * @param {number} preludeId
     */
    constructor(node: ChildNode, kind: number, name: string, params: string, anonymous: boolean, preludeId: number);
}
//# sourceMappingURL=blockRecord.d.ts.map