import type { Rule } from 'postcss';
import type { RuleMeta } from './rule-meta.js';
export type Boundary = {
    first: Rule | null;
    last: Rule | null;
};
/** @param {Map<import('postcss').Container, {first: Rule | null, last: Rule | null}>} captured @param {Rule[]} replaced @param {'first'|'last'} edge */
export declare function replacedBoundary(captured: Map<import('postcss').Container, {
    first: Rule | null;
    last: Rule | null;
}>, replaced: Rule[], edge: 'first' | 'last'): boolean;
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
        previous: Rule | null;
        next: Rule | null;
        active: boolean;
        version: number;
        sourceOrder: number;
    };
    detach: (rule: Rule) => void;
    captureBoundaries: (rules: Rule[]) => Map<any, any>;
    repairMove: (rule: Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void;
    seed: (root: import('postcss').Root) => Rule | null;
    linkReplacements: (replacements: Rule[], previous: Rule | null, next: Rule | null, sourceOrder: number | undefined) => void;
    updateAncestorBoundaries: (replacement: Rule, edge: 'first' | 'last') => void;
};
//# sourceMappingURL=rule-index.d.ts.map