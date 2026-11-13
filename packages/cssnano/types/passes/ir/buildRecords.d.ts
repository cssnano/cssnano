import { BlockRecords } from './blockRecords.js';
import { DeclarationRecord } from './declarationRecord.js';
/**
 * The name a record holds: the ASCII-folded name, except that `@CHARSET` keeps
 * its spelling. Browsers read an encoding only from the exact lowercase bytes,
 * so any other case is an ordinary unknown at-rule.
 *
 * @param {string} written
 * @return {string}
 */
export declare function recordNameOf(written: string): string;
import type { ChildNode, Declaration, Root } from 'postcss';
import type { NodeTable } from './nodeTable.js';
import type { RunContext } from './runContext.js';
/** @import {AtRule, ChildNode, Comment, Container, Declaration, Root, Rule} from 'postcss' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {DeclarationKeys} from './declarationKey.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import MergeState from '../merge/lib/rules/mergeState.js' */
/** @import {RunContext} from './runContext.js' */
/**
 * Builds the records of a stylesheet from its tree, which the window's edits
 * then change. The build is the only code of the window that reads the nodes.
 */
/**
 * @param {ChildNode} node
 * @return {boolean} whether the node holds rules or at-rules
 */
export declare function isRuleOrAtRule(node: ChildNode): boolean;
/**
 * The items of a selector as written: PostCSS's split at its commas, trimmed,
 * with its empty items kept. A rule's ids are the items of its written selector.
 *
 * @param {string} selector the selector as written
 * @return {readonly string[]}
 */
export declare function selectorItemsOf(selector: string): readonly string[];
/**
 * The record of a declaration of the run's stylesheet.
 *
 * @param {Declaration} node
 * @param {RunContext} context
 * @return {DeclarationRecord}
 */
export declare function recordDeclaration(node: Declaration, context: RunContext): DeclarationRecord;
/**
 * Builds the records of a stylesheet from its tree, once per run, and the node
 * of each of their entries. Each child is linked into the chain of its parent,
 * and every rule is a container whose children form its own chain.
 *
 * @param {Root} root
 * @param {RunContext} context the run's state, which gives the tokens and ids the records keep
 * @return {{records: BlockRecords, nodes: NodeTable}}
 */
export declare function buildRecords(root: Root, context: RunContext): {
    records: BlockRecords;
    nodes: NodeTable;
};
//# sourceMappingURL=buildRecords.d.ts.map