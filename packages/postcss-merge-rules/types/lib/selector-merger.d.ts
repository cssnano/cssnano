import type { Rule } from 'postcss';
import type { RuleMeta } from './rule-meta.js';
/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */
/**
 * @param {string[]} browsers
 * @param {Map<string, import('./ensureCompatibility.js').SelectorInfo>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {{ run: (root: import('postcss').Root) => void }}
 */
export default function selectorMerger(browsers: string[], compatibilityCache: Map<string, import('./ensureCompatibility.js').SelectorInfo>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>): {
    run: (root: import('postcss').Root) => void;
};
//# sourceMappingURL=selector-merger.d.ts.map