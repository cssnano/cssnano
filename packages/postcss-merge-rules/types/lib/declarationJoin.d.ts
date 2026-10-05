import type { ChildNode, Container, Declaration, Rule } from 'postcss';
import type MergeState from './mergeState.js';
/**
 * A rule made only of declarations. Comments and nested rules would be
 * stranded or reordered by moving declarations out of the rule.
 *
 * @param {ChildNode} node
 * @return {node is Rule}
 */
export declare const isDeclarationRule: (node: ChildNode) => node is Rule;
/**
 * The positions in `later` of declarations that repeat every one of
 * `declarations`, or null when a repeat does not stand first for its
 * property, since removing it would then change what `later` sets.
 *
 * @param {Declaration[]} declarations
 * @param {Declaration[]} later
 * @return {Set<number> | null}
 */
export declare function claimRepeats(declarations: Declaration[], later: Declaration[]): Set<number> | null;
export type Group = {
    rule: Rule;
    position: number;
    declarations: Declaration[];
    ids: string[];
    /**
     * listed selectors, built on demand
     */
    selectors: Set<string> | null;
    /**
     * declaration bytes, each with its separator, or -1
     */
    bytes: number;
};
/**
 * A later rule that repeats all declarations of an earlier rule adds its
 * selectors to that rule, and gives up the repeated declarations, when no
 * node between them sets a property they also set: the earlier rule then
 * applies the declarations to the same elements as before. The earlier
 * rule, the group, keeps its position and its declarations, so it can take
 * further rules.
 *
 * @param {Container} parent
 * @param {MergeState} mergeState
 * @return {boolean}
 */
export default function joinByDeclarations(parent: Container, mergeState: MergeState): boolean;
//# sourceMappingURL=declarationJoin.d.ts.map