import type { Rule } from 'postcss';
import type { Placement } from './ruleSequence.js';
/** @import {Rule} from 'postcss' */
/** @import {Placement} from './ruleSequence.js' */
/**
 * Appends the content of `incoming` to `receiving`. A declaration of
 * `incoming` is redundant only when the last declaration of `receiving` that
 * can set the same property already has an identical value. Otherwise it
 * revives an overridden value or overrides intermediate declarations, so
 * appending it is required to preserve the cascade result.
 *
 * @param {Rule} receiving
 * @param {Rule} incoming
 * @return {void}
 */
export declare function appendDeclarations(receiving: Rule, incoming: Rule): void;
/**
 * Splits the declarations both rules set out of them into a rule with both
 * selectors, which takes the place of the later rule, between a leftover of
 * each. A rule left without declarations is dropped.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {Set<number>} claimedEarlierIndices
 * @param {Set<number>} claimedIndices
 * @param {import('./mergeState.js').default} mergeState
 * @return {Placement | null} null when the output would not get shorter
 */
export declare function buildMergedRule(first: Rule, second: Rule, claimedEarlierIndices: Set<number>, claimedIndices: Set<number>, mergeState: import('./mergeState.js').default): Placement | null;
//# sourceMappingURL=ruleRewrite.d.ts.map