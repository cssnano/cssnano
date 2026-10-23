import type { Container, Document, Helpers, Root } from 'postcss';
import type { Reducer, Stage, TextReducer } from './host.js';
import type { CommentState } from './comments/nodeComments.js';
export type PropertyEntry = {
    plan: readonly Reducer[] | null;
    memos: (Map<string, string> | undefined)[];
};
export type TextEntry = {
    plan: readonly TextReducer[] | null;
    memos: (Map<string, string> | undefined)[];
};
export type RunState = {
    /**
     * in pipeline order
     */
    stages: readonly Stage[];
    properties: Map<string, PropertyEntry>;
    /**
     * by at-rule name
     */
    atRules: Map<string, TextEntry>;
    selectors: TextEntry;
    contexts: WeakMap<Container | Document, number>;
    helpers: Helpers;
    /**
     * the comment removal of this run, or null when no stage removes comments
     */
    comments: CommentState | null;
};
/**
 * Runs the comment, value, prelude and selector parts of the stages over a
 * stylesheet in a single walk, in document order. Each node loses its comments
 * first, then each text is read from its source, folded through its plan with
 * its context, and written back only when it changed.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @param {Root} root
 * @param {Helpers} helpers
 */
export declare function walkStylesheet(stages: readonly Stage[], root: Root, helpers: Helpers): void;
//# sourceMappingURL=traversal.d.ts.map