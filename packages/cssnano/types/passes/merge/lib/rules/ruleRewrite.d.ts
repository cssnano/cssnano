import { PropertyWrites } from './propertyWrites.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { RuleRecord } from './ruleRecord.js';
import type { ChainPosition } from './blockRecord.js';
import type RuleSequence, { Placement } from './ruleSequence.js';
/**
 * The writes of a rule's declarations, numbered by their position.
 *
 * @param {DeclarationRecord[]} declarations
 * @return {PropertyWrites}
 */
export declare function writesOf(declarations: DeclarationRecord[]): PropertyWrites;
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
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @param {DeclarationRecord[]} shared the shared declarations, in their order in `first`
 * @param {Set<ChainPosition>} claimedEarlierIndices
 * @param {Set<ChainPosition>} claimedIndices
 * @param {import('./mergeState.js').default} mergeState
 * @param {number} secondLink the index of `second` in the sweep
 * @param {RuleSequence} sequence
 * @param {Map<number, boolean>} outsideDeclarations
 * @return {Placement | null} null when the output would not get shorter
 */
export declare function buildMergedRule(first: RuleRecord, second: RuleRecord, shared: DeclarationRecord[], claimedEarlierIndices: Set<ChainPosition>, claimedIndices: Set<ChainPosition>, mergeState: import('./mergeState.js').default, secondLink: number, sequence: RuleSequence, outsideDeclarations: Map<number, boolean>): Placement | null;
//# sourceMappingURL=ruleRewrite.d.ts.map