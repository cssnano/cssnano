import type { Container, Rule } from 'postcss';
import type RuleSequence, { RuleLink } from './ruleSequence.js';
/** @import {ChildNode, Container, Declaration, Rule} from 'postcss' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */
/** @param {string[]} selectors @return {number} */
export declare function selectorsLength(selectors: string[]): number;
export declare const SHARING_WINDOW = 10;
export type Follower = {
    rule: Rule;
    /**
     * where it repeats the shared declarations
     */
    claimed: Set<number>;
};
export type Group = {
    /**
     * the rules that join the shared rule
     */
    followers: Follower[];
    /**
     * the selectors they add to it
     */
    added: string[];
};
/**
 * The rules after the pair that join the shared rule: the prefix of the rules
 * that repeat every shared declaration which shortens the output most. A rule
 * that does not pay for its selector may still be worth it for the ones after
 * it.
 *
 * Each rule hands its shared declarations up to the shared rule, across the
 * leftovers of the rules before it, so the run ends at a rule that cannot
 * cross them, or whose leftover sets a shared property and so blocks every
 * rule after it. What a rule saves follows from lengths alone, so those
 * checks run only for a prefix that would pay.
 *
 * @param {Rule} first
 * @param {RuleLink} second
 * @param {Set<number>} claimedEarlierIndices where the shared declarations stand in `first`
 * @param {Set<number>} claimedIndices where they stand in `second`
 * @param {number} sharedBytes
 * @param {number} prefixed the bytes of the shared declarations a later plugin may remove
 * @param {number} delta how much the pair alone lengthens the output
 * @param {import('./mergeState.js').default} mergeState
 * @param {RuleSequence} sequence
 * @param {WeakMap<Container, boolean>} outsideDeclarations
 * @return {Group | null}
 */
export declare function findGroup(first: Rule, second: RuleLink, claimedEarlierIndices: Set<number>, claimedIndices: Set<number>, sharedBytes: number, prefixed: number, delta: number, mergeState: import('./mergeState.js').default, sequence: RuleSequence, outsideDeclarations: WeakMap<Container, boolean>): Group | null;
/**
 * Records in `earliest` the farthest pair before `resume` that a rewrite at
 * `link` can change, if it is farther than the recorded pair. A later rule
 * joins a group only by repeating the shared declarations, so the walk stops
 * at the first rule that breaks that run or after `PAIR_REACH` links.
 *
 * @param {RuleLink} link a rule that a rewrite placed
 * @param {RuleLink} resume the sweep's resume point; only pairs before it count
 * @param {number} offset how many links `link` stands after the first new rule
 * @param {number[]} scratch the declaration keys still shared by the walk
 * @param {import('./mergeState.js').default} mergeState
 * @param {{link: RuleLink | null, distance: number}} earliest the best pair so
 * far, and its distance in links from the first new rule
 * @return {void}
 */
export declare function earliestPairReaching(link: RuleLink, resume: RuleLink, offset: number, scratch: number[], mergeState: import('./mergeState.js').default, earliest: {
    link: RuleLink | null;
    distance: number;
}): void;
//# sourceMappingURL=sharedRuleGroup.d.ts.map