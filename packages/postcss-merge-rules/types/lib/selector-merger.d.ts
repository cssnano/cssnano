import type { Rule } from 'postcss';
import type { Placement } from './rule-sequence.js';
import type { RuleMeta } from './rule-meta.js';
/** @import {Rule} from 'postcss' */
/** @import {Placement} from './ruleSequence.js' */
/** @import {RuleMeta} from './ruleMeta.js' */
export default class SelectorMerger {
    #private;
    /**
     * @param {string[]} browsers
     * @param {Map<string, import('./ensureCompatibility.js').SelectorInfo>} compatibilityCache
     * @param {WeakSet<Rule>} ruleCache
     * @param {WeakMap<Rule, RuleMeta>} ruleMeta
     */
    constructor(browsers: string[], compatibilityCache: Map<string, import('./ensureCompatibility.js').SelectorInfo>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>);
    /**
     * Rules with the same declarations in the same order become one rule with
     * both selectors.
     *
     * @param {Rule} first
     * @param {Rule} second
     * @return {Placement | null}
     */
    mergeMatchingDeclarations(first: Rule, second: Rule): Placement | null;
    /**
     * Rules with the same selector become one rule with both declaration lists.
     *
     * @param {Rule} first
     * @param {Rule} second
     * @return {Placement | null}
     */
    mergeMatchingSelectors(first: Rule, second: Rule): Placement | null;
    /**
     * @param {Rule} first
     * @param {Rule} second
     * @return {Placement | null} null when sharing the declarations would not
     * make the output shorter
     */
    mergeSharedDeclarations(first: Rule, second: Rule): Placement | null;
    /**
     * @param {import('postcss').Root} root
     * @return void
     */
    run(root: import('postcss').Root): void;
}
//# sourceMappingURL=selector-merger.d.ts.map
