import { RuleRecord } from './ruleRecord.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { ArenaIndex } from './blockRecord.js';
import type RuleSequence, { Placement } from './ruleSequence.js';
import type DeclarationScan from './declarationScan.js';
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
 * @param {Set<ArenaIndex>} claimedIndices the arena indices of the declarations of `second` that repeat `shared`
 * @param {import('./mergeState.js').default} mergeState
 * @param {ArenaIndex} secondLink the index of `second` in the sweep
 * @param {RuleSequence} sequence
 * @param {DeclarationScan} scan
 * @return {Placement | null} null when the output would not get shorter
 */
export declare function buildMergedRule(first: RuleRecord, second: RuleRecord, shared: DeclarationRecord[], claimedIndices: Set<ArenaIndex>, mergeState: import('./mergeState.js').default, secondLink: ArenaIndex, sequence: RuleSequence, scan: DeclarationScan): Placement | null;
//# sourceMappingURL=ruleRewrite.d.ts.map