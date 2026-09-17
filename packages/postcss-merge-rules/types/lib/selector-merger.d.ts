import type { Rule } from 'postcss';
import type { RuleMeta } from './rule-meta.js';
export type MutationOutcome = {
    previous: Rule | null;
    replacements: Rule[];
    next: Rule | null;
    movedAcrossParents: boolean;
    kind: 'equal-declaration' | 'equal-selector' | 'partial';
};
/**
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {{ run: (root: import('postcss').Root) => void }}
 */
export default function selectorMerger(browsers: string[], compatibilityCache: Map<string, boolean>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, RuleMeta>): {
    run: (root: import('postcss').Root) => void;
};
//# sourceMappingURL=selector-merger.d.ts.map