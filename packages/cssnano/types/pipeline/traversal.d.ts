import type { AtRule, Container, Document, Helpers, Root } from 'postcss';
import type { Reducer, Stage, TextReducer } from './host.js';
import type { SelectorEntry } from './selectorReduce.js';
import type { CommentState } from './comments/nodeComments.js';
export type PropertyEntry = {
    plan: readonly Reducer[] | null;
    memos: (Map<string, string> | undefined)[];
    mode: import('../values/valueBuffer.js').TokenizeMode | undefined;
};
export type TextEntry = {
    plan: readonly TextReducer[] | null;
    memos: (Map<string, string> | undefined)[];
    tightens: boolean;
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
    selectors: SelectorEntry;
    contexts: WeakMap<Container | Document, number>;
    helpers: Helpers;
    /**
     * the comment removal of this run, or null when no stage removes comments
     */
    comments: CommentState | null;
    /**
     * whether a default `@namespace` has been reached, so later rules have it in their context
     */
    defaultNamespace: boolean;
    /**
     * whether normalizeWhitespace is on, which removes the stray semicolons and reattaches the escapes of blocks
     */
    normalizeWhitespace: boolean;
    /**
     * the outermost overridable at-rules in document order, or null when discardOverridden is off
     */
    overridable: AtRule[] | null;
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
 * @param {ReadonlyMap<string, unknown>} transforms the whole-stylesheet transforms of the run, by entry name
 */
export declare function walkStylesheet(stages: readonly Stage[], root: Root, helpers: Helpers, transforms: ReadonlyMap<string, unknown>): void;
//# sourceMappingURL=traversal.d.ts.map