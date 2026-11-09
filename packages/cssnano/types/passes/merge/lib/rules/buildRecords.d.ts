import { BlockRecords } from './blockRecords.js';
import type { ChildNode, Root } from 'postcss';
import type { RunContext } from '../../../ir/runContext.js';
/** @import {AtRule, ChildNode, Comment, Container, Root, Rule} from 'postcss' */
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
 * Builds the records of a stylesheet from its tree, once per run. Each child is
 * linked into the chain of its parent, and every rule is a container whose
 * children form its own chain.
 *
 * @param {Root} root
 * @param {RunContext} context the run's state, which gives the tokens and ids the records keep
 * @return {BlockRecords}
 */
export declare function buildRecords(root: Root, context: RunContext): BlockRecords;
//# sourceMappingURL=buildRecords.d.ts.map