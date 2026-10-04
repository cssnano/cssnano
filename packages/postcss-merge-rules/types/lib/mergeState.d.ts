import type { Container, Declaration, Rule } from 'postcss';
import type { RuleMeta } from './ruleMeta.js';
import type { RuleDeclarationKeys } from './ruleMeta.js';
/**
 * The state shared by every merge of one stylesheet.
 */
export default class MergeState {
    #private;
    /**
     * @param {string[]} browsers
     * @param {Map<string, import('./ensureCompatibility.js').SelectorInfo>} compatibilityCache
     * @param {WeakSet<Rule>} ruleCache rules whose selectors are known to be compatible
     * @param {WeakMap<Rule, RuleMeta>} ruleMeta
     */
    constructor(browsers: string[], compatibilityCache: Map<string, import('./ensureCompatibility.js').SelectorInfo>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>);
    /**
     * @param {Rule} rule
     * @return {RuleMeta}
     */
    meta(rule: Rule): RuleMeta;
    /**
     * Drops the description of a rule whose selectors or declarations changed
     * or that left the stylesheet. It is rebuilt from the rule when next
     * needed, so a rule that was never described stays so.
     *
     * @param {Rule} rule
     */
    forget(rule: Rule): void;
    /**
     * Numbers declarations so equal ones, with the same property, value and
     * importance, share a key for the whole stylesheet. An arrow function, so
     * it passes as a callback without a closure per call.
     *
     * @param {Declaration} declaration
     * @return {number}
     */
    declarationKey: (declaration: Declaration) => number;
    /**
     * @param {Rule} rule
     * @return {RuleDeclarationKeys}
     */
    declarationKeysOf(rule: Rule): RuleDeclarationKeys;
    /**
     * Records that every selector of the rule is compatible with the target
     * browsers, so `canMerge` does not check them again. The caller must have
     * established it: a rule built from selectors that passed `canMerge`
     * qualifies, since a list is compatible exactly when each selector is.
     *
     * @param {Rule} rule
     */
    markCompatible(rule: Rule): void;
    /**
     * Appends selectors to the rule's selector list, keeping its vendor prefix
     * profile in step.
     *
     * @param {Rule} rule
     * @param {string[]} selectors
     */
    addSelectors(rule: Rule, selectors: string[]): void;
    /**
     * Gives `later` the selectors of `earlier`, which stands before it and is
     * dropped by the caller.
     *
     * @param {Rule} later
     * @param {Rule} earlier
     */
    absorbEarlier(later: Rule, earlier: Rule): void;
    /**
     * Whether the rules can be merged. `parentA` and `parentB` are where the
     * rules stand, which differs from their `parent` for a rule that moved
     * during the sweep.
     *
     * @param {Rule} ruleA
     * @param {Rule} ruleB
     * @param {Container | undefined} [parentA]
     * @param {Container | undefined} [parentB]
     * @return {boolean}
     */
    canMerge(ruleA: Rule, ruleB: Rule, parentA?: Container | undefined, parentB?: Container | undefined): boolean;
}
//# sourceMappingURL=mergeState.d.ts.map