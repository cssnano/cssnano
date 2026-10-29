import { PropertyWrites } from './lastWriteIndex.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
import type { Container, Declaration, Rule } from 'postcss';
import type RuleSequence, { Placement, RuleLink } from './ruleSequence.js';
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
/** @import {Container, Declaration, Rule} from 'postcss' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */
/**
 * The writes of a rule's declarations, numbered by their position.
 *
 * @param {Declaration[]} declarations
 * @param {PropertyTable} table
 * @return {PropertyWrites}
 */
export declare function writesOf(declarations: Declaration[], table: PropertyTable): PropertyWrites;
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