import type { Container, Document, Helpers, Root } from 'postcss';
import type { Stage } from './host.js';
import type { PlanEntry } from './plan.js';
import type { TextTable } from '../values/textTable.js';
import type { CommentState } from './comments/nodeComments.js';
export type RunState = {
    /**
     * in pipeline order
     */
    stages: readonly Stage[];
    /**
     * by at-rule name
     */
    atRules: Map<string, PlanEntry>;
    selectors: PlanEntry;
    contexts: WeakMap<Container | Document, number>;
    helpers: Helpers;
    /**
     * the text table the walk fills
     */
    table: TextTable;
    /**
     * the comment removal of this run, or null when no stage removes comments
     */
    comments: CommentState | null;
    /**
     * whether a default `@namespace` has been reached, so later rules have it in their context
     */
    defaultNamespace: boolean;
    /**
     * whether normalizeWhitespace is on, which reattaches the escapes of blocks
     */
    normalizeWhitespace: boolean;
};
/**
 * Runs the comment, prelude and selector parts of the stages over a stylesheet
 * in a single walk, in document order. Each node loses its comments first, then
 * each text is read from its source, folded through its plan with its context,
 * and written back only when it changed. Declarations are left to the record
 * walk.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @param {Root} root
 * @param {Helpers} helpers
 * @param {ReadonlyMap<string, unknown>} transforms the whole-stylesheet transforms of the run, by entry name
 * @param {TextTable} table the selector and at-rule tokens the walk leaves for later readers
 * @param {CommentState | null} comments the comment removal of the stylesheet, or null when no stage removes comments
 */
export declare function walkStylesheet(stages: readonly Stage[], root: Root, helpers: Helpers, transforms: ReadonlyMap<string, unknown>, table: TextTable, comments: CommentState | null): void;
//# sourceMappingURL=traversal.d.ts.map