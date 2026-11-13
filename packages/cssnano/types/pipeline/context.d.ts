import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { TokenLists } from '../passes/ir/tokenLists.js';
import type { Container, Document } from 'postcss';
/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {DeclarationRecord} from '../passes/ir/declarationRecord.js' */
/** @import {TokenLists} from '../passes/ir/tokenLists.js' */
/** @import {AtRule, Container, Document} from 'postcss' */
/**
 * The context of a declaration is an integer whose bits say where it sits. The
 * bits are added rather than or-ed, since the repository forbids bitwise
 * operators.
 */
/** Inside an at-rule whose name ends in `keyframes`. */
export declare const IN_KEYFRAMES = 1;
/** A direct declaration of an `@property` rule. */
export declare const IN_PROPERTY = 2;
/** With IN_PROPERTY, when the rule's syntax allows percentages. */
export declare const PERCENTAGE_SYNTAX = 4;
/** A rule directly inside an at-rule named `keyframes` or a vendor spelling of it. */
export declare const KEYFRAME_RULE = 8;
/**
 * Set by the walk on a rule after a default `@namespace`, which makes a
 * universal selector significant there.
 */
export declare const DEFAULT_NAMESPACE = 16;
/**
 * @param {number} context
 * @param {number} bit one of the context bits
 * @returns {boolean} whether the bit is set
 */
export declare function hasContextBit(context: number, bit: number): boolean;
/**
 * @param {number} context
 * @param {number} bit a context bit that is not yet set in the context
 * @returns {number} the context with the bit set
 */
export declare function withBit(context: number, bit: number): number;
/**
 * The context of the declarations that a container holds directly. Each
 * container is computed once from its parent, through the cache of the run.
 *
 * @param {Container | Document} node a rule, at-rule or the root
 * @param {WeakMap<Container | Document, number>} contexts the context of each container of the run
 * @returns {number}
 */
export declare function contextOf(node: Container | Document, contexts: WeakMap<Container | Document, number>): number;
/**
 * The context of a container record, from its parent's context, as the node
 * form `contextOf` gives it for a container node. The stylesheet is the only
 * container without a parent, and its context is 0.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index a rule or an at-rule with a block
 * @param {number} parentContext the context of the container that holds it
 * @returns {number}
 */
export declare function recordContextOf(records: BlockRecords, tokenLists: TokenLists, index: ArenaIndex, parentContext: number): number;
//# sourceMappingURL=context.d.ts.map