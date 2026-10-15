import type { Rule } from 'postcss';
import type { RuleMeta } from './ruleMeta.js';
/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './ruleMeta.js' */
/**
 * @param {import('postcss').Root} root
 * @param {string[]} browsers
 * @param {Map<string, import('./ensureCompatibility.js').SelectorInfo>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return void
 */
export default function runMerge(root: import('postcss').Root, browsers: string[], compatibilityCache: Map<string, import('./ensureCompatibility.js').SelectorInfo>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>): void;
//# sourceMappingURL=selectorMerger.d.ts.map