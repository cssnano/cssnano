import type { Container, Declaration, Rule } from 'postcss';
import type { PropertyTable } from '../../../ir/propertyTable.js';
import type { RuleMeta } from './ruleMeta.js';
import type { RuleDeclarationKeys } from './ruleMeta.js';
/**
 * The state shared by every merge of one stylesheet.
 */
export default class MergeState {
    #private;
    /**
     * The keys of the property names this stylesheet's merges compare.
     *
     * @type {PropertyTable}
     */
    properties: PropertyTable;
    /**
     * The summaries of the stylesheet's blocks, read by the at-rule joins.
     *
     * @type {import('../../../ir/blockTable.js').BlockTable}
     */
    blocks: import('../../../ir/blockTable.js').BlockTable;
    /**
     * @param {readonly string[]} browsers
     * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
     */
    constructor(browsers: readonly string[], context?: import('../../../ir/runContext.js').RunContext);
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
     * The elements the rule can match. An arrow function, so it passes as a
     * callback without a closure per call.
     *
     * @param {Rule} rule
     * @return {string[] | null}
     */
    elementKeysOf: (rule: Rule) => string[] | null;
    /**
     * Numbers declarations so equal ones, with the same property, value,
     * importance and hack prefix, share a key for the whole run. An arrow
     * function, so it passes as a callback without a closure per call.
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
     * Reports a rule a merge created, when the run collects them, so the driver
     * canonicalizes it. A rule no run collects is left alone.
     *
     * @param {Rule} rule
     */
    reportCreated(rule: Rule): void;
    /**
     * Appends selectors to the rule's selector list, keeping its vendor prefix
     * profile in step.
     *
     * @param {Rule} rule
     * @param {string[]} selectors
     * @return {readonly string[] | null} the element keys the selectors add, or
     * null when the rule's elements are not listed
     */
    addSelectors(rule: Rule, selectors: string[]): readonly string[] | null;
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