import type { Rule } from 'postcss';
import type { RuleMeta } from './rule-meta.js';
export type Boundary = {
    first: Rule | null;
    last: Rule | null;
};
/**
 * Doubly linked list of the rules in source order, plus the first and last
 * rule of every container, so the worklist can find adjacent merge candidates
 * and keep them current as rules are removed, moved and replaced.
 *
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 */
export default function createRuleIndex(ruleMeta: WeakMap<Rule, RuleMeta>): {
    active: WeakMap<Rule, RuleMeta & {
        selectorKey: string;
        contentKey: string;
        declarationIds: number[];
        declarationIdSet: Set<number>;
        parent: import('postcss').Container | undefined;
        previous: Rule | null;
        next: Rule | null;
        active: boolean;
        version: number;
        sourceOrder: number;
    }>;
    refresh: (rule: Rule, sourceOrder?: number) => RuleMeta & {
        selectorKey: string;
        contentKey: string;
        declarationIds: number[];
        declarationIdSet: Set<number>;
        parent: import('postcss').Container | undefined;
        previous: Rule | null;
        next: Rule | null;
        active: boolean;
        version: number;
        sourceOrder: number;
    };
    detach: (rule: Rule) => void;
    repairMove: (rule: Rule) => void;
    seed: (root: import('postcss').Root) => Rule | null;
    linkReplacements: (replacements: Rule[], previous: Rule | null, next: Rule | null, sourceOrder: number | undefined) => void;
};
//# sourceMappingURL=rule-index.d.ts.map