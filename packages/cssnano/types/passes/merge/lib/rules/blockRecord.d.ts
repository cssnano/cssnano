/** @import {ChildNode, Container} from 'postcss' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
import type { ChildNode, Container } from 'postcss';
/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. Its children are the
 * entries its chain links, which `BlockRecords` keeps.
 */
export declare class BlockRecord {
    /** @type {Container} */
    node: Container;
    /** @type {boolean} whether the block applies nothing once it is empty */
    droppable: boolean;
    /**
     * The first entry of the chain of live children, which `BlockRecords` links,
     * or -1 when the block holds none.
     *
     * @type {number}
     */
    first: number;
    /**
     * The last entry of the chain of live children, or -1 when the block holds
     * none.
     *
     * @type {number}
     */
    last: number;
    /**
     * The number of entries in the chain, kept by each link and unlink.
     *
     * @type {number}
     */
    count: number;
    /** @type {number} the place of the block in the arena of its records, -1 until added */
    index: number;
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
     * @type {string | undefined}
     */
    leadingWhitespace: string | undefined;
    /**
     * @param {Container} node
     * @param {boolean} droppable
     */
    constructor(node: Container, droppable: boolean);
}
/**
 * A child of a block that is neither a rule, an at-rule with a block, nor a
 * declaration: a comment or a statement at-rule. It takes an index in the arena
 * so that a block's children hold indices alone.
 */
export declare class NodeEntry {
    /** @type {ChildNode} the node the entry stands for */
    node: ChildNode;
    /** @type {number} the place of the entry in the arena, -1 until added */
    index: number;
    /** @param {ChildNode} node */
    constructor(node: ChildNode);
}
//# sourceMappingURL=blockRecord.d.ts.map