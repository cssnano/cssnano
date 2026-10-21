import { PropertyWrites } from './lastWriteIndex.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
import type { Container, Declaration, Rule } from 'postcss';
import type RuleSequence, { Placement, RuleLink } from './ruleSequence.js';
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
/** @import {Container, Declaration, Rule} from 'postcss' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */
/**
 * Appends the content of `incoming` to `receiving`. A declaration of
 * `incoming` is redundant only when the last declaration of `receiving` that
 * can set the same property already has an identical value. Otherwise it
 * revives an overridden value or overrides intermediate declarations, so
 * appending it is required to preserve the cascade result.
 *
 * @param {Rule} receiving
 * @param {Rule} incoming
 * @param {PropertyTable} table
 * @return {void}
 */
export declare function appendDeclarations(receiving: Rule, incoming: Rule, table: PropertyTable): void;
/**
 * The writes of a rule's declarations, numbered by their position.
 *
 * @param {Declaration[]} declarations
 * @param {PropertyTable} table
 * @return {PropertyWrites}
 */
export declare function writesOf(declarations: Declaration[], table: PropertyTable): PropertyWrites;
/**
 * `appendDeclarations` for a rule that keeps receiving: the caller holds its
 * declarations and their writes, which grow with it, so an append costs time
 * in the incoming rule only.
 *
 * @param {Rule} receiving
 * @param {Declaration[]} kept the declarations of `receiving`, extended in place
 * @param {PropertyWrites} index the writes of `kept`, extended in place
 * @param {Rule} incoming
 * @return {void}
 */
export declare function appendToDeclarations(receiving: Rule, kept: Declaration[], index: PropertyWrites, incoming: Rule): void;
/**
 * Splits the declarations the rules set out of them into a rule with all
 * their selectors, which takes the place of the later rule of the pair,
 * between a leftover of each rule. A rule left without declarations is
 * dropped. Rules after the pair that repeat the shared declarations join
 * when that makes the output shorter.
 *
 * The lengths are those of minified output: raws would count the whitespace
 * of the source, which a minifier removes, so a merge that pays only in
 * source bytes would grow the output.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {Set<number>} claimedEarlierIndices
 * @param {Set<number>} claimedIndices
 * @param {import('./mergeState.js').default} mergeState
 * @param {RuleLink} secondLink where `second` stands in the sweep
 * @param {RuleSequence} sequence
 * @param {WeakMap<Container, boolean>} outsideDeclarations
 * @return {Placement | null} null when the output would not get shorter
 */
export declare function buildMergedRule(first: Rule, second: Rule, claimedEarlierIndices: Set<number>, claimedIndices: Set<number>, mergeState: import('./mergeState.js').default, secondLink: RuleLink, sequence: RuleSequence, outsideDeclarations: WeakMap<Container, boolean>): Placement | null;
//# sourceMappingURL=ruleRewrite.d.ts.map