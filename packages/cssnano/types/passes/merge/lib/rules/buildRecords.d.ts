import { BlockRecords } from './blockRecords.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { ChildNode, Declaration, Root } from 'postcss';
import type { NodeTable } from './nodeTable.js';
import type { RunContext } from '../../../ir/runContext.js';
/** @import {AtRule, ChildNode, Comment, Container, Declaration, Root, Rule} from 'postcss' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import MergeState from './mergeState.js' */
/** @import {RunContext} from '../../../ir/runContext.js' */
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