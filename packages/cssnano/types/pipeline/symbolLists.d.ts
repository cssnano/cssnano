import type { AnyNode, AtRule, Declaration, Rule } from 'postcss';
import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { TokenLists } from '../passes/ir/tokenLists.js';
export type SymbolLists = {
    /**
     * `@font-face` blocks
     */
    fontFaces: AtRule[];
    /**
     * `@counter-style` at-rules
     */
    counterStyles: AtRule[];
    /**
     * `@keyframes` at-rules
     */
    keyframes: AtRule[];
    /**
     * `@namespace` at-rules
     */
    namespaces: AtRule[];
    /**
     * rules whose selector has a namespace bar
     */
    namespaceRules: Rule[];
    /**
     * `font` and `font-family` declarations in a rule
     */
    fontDecls: Declaration[];
    /**
     * `list-style` and `system` declarations
     */
    listStyleDecls: Declaration[];
    /**
     * `animation` declarations
     */
    animationDecls: Declaration[];
    /**
     * `z-index` declarations
     */
    zIndexDecls: Declaration[];
    /**
     * `@layer` at-rules, with or without a block
     */
    layers: AtRule[];
    /**
     * `@function` rules
     */
    functions: AtRule[];
    /**
     * `@mixin` and `@apply` rules
     */
    parameterRules: AtRule[];
    /**
     * `@container`, `@when` and `@else` rules
     */
    conditionRules: AtRule[];
    /**
     * every declaration
     */
    decls: Declaration[];
};
/**
 * The nodes that the advanced transforms read, by kind. The walk after merge
 * fills them, so each transform edits lists rather than walking the tree.
 *
 * @typedef {object} SymbolLists
 * @property {AtRule[]} fontFaces `@font-face` blocks
 * @property {AtRule[]} counterStyles `@counter-style` at-rules
 * @property {AtRule[]} keyframes `@keyframes` at-rules
 * @property {AtRule[]} namespaces `@namespace` at-rules
 * @property {Rule[]} namespaceRules rules whose selector has a namespace bar
 * @property {Declaration[]} fontDecls `font` and `font-family` declarations in a rule
 * @property {Declaration[]} listStyleDecls `list-style` and `system` declarations
 * @property {Declaration[]} animationDecls `animation` declarations
 * @property {Declaration[]} zIndexDecls `z-index` declarations
 * @property {AtRule[]} layers `@layer` at-rules, with or without a block
 * @property {AtRule[]} functions `@function` rules
 * @property {AtRule[]} parameterRules `@mixin` and `@apply` rules
 * @property {AtRule[]} conditionRules `@container`, `@when` and `@else` rules
 * @property {Declaration[]} decls every declaration
 */
/**
 * @returns {SymbolLists}
 */
export declare function createSymbolLists(): SymbolLists;
/**
 * Whether a node still hangs from the root. A transform that ran before a
 * removal may have detached a node that the lists hold.
 *
 * @param {AnyNode} node
 * @returns {boolean}
 */
export declare function isAttached(node: AnyNode): boolean;
/**
 * Sorts one kept node into the lists it belongs to. Names are matched the way
 * the transforms match them, so a list holds exactly what they would find.
 *
 * @param {SymbolLists} lists
 * @returns {(node: AnyNode) => void}
 */
export declare function symbolVisit(lists: SymbolLists): (node: AnyNode) => void;
export type RecordSymbolLists = {
    [K in keyof SymbolLists]: ArenaIndex[];
};
/**
 * The records that the advanced transforms read, by kind: the same lists as
 * `SymbolLists`, holding the arena indices of the records.
 *
 * @typedef {{[K in keyof SymbolLists]: ArenaIndex[]}} RecordSymbolLists
 */
/**
 * @returns {RecordSymbolLists}
 */
export declare function createRecordSymbolLists(): RecordSymbolLists;
/**
 * Whether an entry still hangs from the stylesheet. A removed container's
 * children still name it as their parent, so the walk must reach the root.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @returns {boolean}
 */
export declare function isRecordAttached(records: BlockRecords, index: ArenaIndex): boolean;
/**
 * Sorts one kept record into the lists it belongs to, as `symbolVisit` does for
 * a node. A rule's selector has a namespace bar when one of its selector lists
 * holds a `|` token.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {RecordSymbolLists} lists
 * @param {ArenaIndex} index
 * @returns {void}
 */
export declare function recordSymbolVisit(records: BlockRecords, tokenLists: TokenLists, lists: RecordSymbolLists, index: ArenaIndex): void;
//# sourceMappingURL=symbolLists.d.ts.map