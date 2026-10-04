import type { Container, Rule } from 'postcss';
import type { RuleMeta } from './ruleMeta.js';
import type { RuleProfile } from './scan.js';
/**
 * The state shared by every merge of one stylesheet.
 */
export default class MergeContext {
    lookup: (selector: string) => import("./ensureCompatibility.js").SelectorInfo;
    ruleCache: WeakSet<Rule>;
    ruleMeta: WeakMap<Rule, RuleMeta>;
    /** @type {WeakMap<RuleMeta, RuleProfile>} */
    profiles: WeakMap<RuleMeta, RuleProfile>;
    /** @type {Map<string, number>} */
    declarationIds: Map<string, number>;
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
//# sourceMappingURL=mergeContext.d.ts.map