import type { Rule } from 'postcss';
import type { RuleMeta } from './ruleMeta.js';
/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './ruleMeta.js' */
/**
 * @param {import('postcss').Root} root
 * @param {readonly string[]} browsers
 * @param {Map<string, import('./ensureCompatibility.js').SelectorInfo>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
 * @return void
 */
export default function runMerge(root: import('postcss').Root, browsers: readonly string[], compatibilityCache: Map<string, import('./ensureCompatibility.js').SelectorInfo>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>, context?: import('../../../ir/runContext.js').RunContext): void;
//# sourceMappingURL=selectorMerger.d.ts.map