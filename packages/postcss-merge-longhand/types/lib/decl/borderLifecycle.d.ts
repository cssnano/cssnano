import type { Declaration } from 'postcss';
/**
 * `insertCloned` records the support a new node inherits, but these
 * merges place their node themselves; a clone postcss makes carries the value
 * and not the provenance, so it has to be recorded here too.
 *
 * @param {Declaration} source
 * @param {Partial<import('postcss').DeclarationProps>} props
 * @return {Declaration}
 */
export declare function cloneWithSupport(source: Declaration, props: Partial<import('postcss').DeclarationProps>): Declaration;
/**
 * @param {{values: [string, string, string], nextValues: [string, string, string], decl: Declaration, nextDecl: Declaration, index: number}} arg
 * @return {void}
 */
export declare function mergeRedundant({ values, nextValues, decl, nextDecl, index }: {
    values: [string, string, string];
    nextValues: [string, string, string];
    decl: Declaration;
    nextDecl: Declaration;
    index: number;
}): void;
/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export declare function mergeBorderSpacing(rule: import('postcss').Rule): void;
/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export declare function cleanup(rule: import('postcss').Rule): void;
/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export declare function explode(rule: import('postcss').Rule): void;
/**
 * `border`, `border-<side>` and `border-<component>` all reach a side's
 * component without naming it, so the last declaration to set one side's
 * component is not always the longhand that specifies it, and if they follow
 * a longhand, they override the value set by the longhand.
 *
 * @param {import('postcss').ChildNode[]} nodes the nodes preceding the merge
 * @param {string} side one of `topRightBottomLeft`
 * @param {string} component one of `widthStyleColor`
 * @return {Declaration | undefined} the longhand the side's component comes
 * from, when a longhand is where it comes from
 */
export declare function specifiedBy(nodes: import('postcss').ChildNode[], side: string, component: string): Declaration | undefined;
/**
 * When a merge inserts at a range's start, later declarations for the same
 * property remain. Those that are fallbacks or hacks must stay; others can be
 * subsumed. Returns undefined if any repeat must be preserved.
 *
 * @param {import('postcss').Rule} rule
 * @param {Declaration} start merge insertion point
 * @param {Declaration[]} chosen declarations being merged, one per property
 * @return {Declaration[] | undefined} repeats that can safely be removed
 */
export declare function subsumedAfter(rule: import('postcss').Rule, start: Declaration, chosen: Declaration[]): Declaration[] | undefined;
//# sourceMappingURL=borderLifecycle.d.ts.map