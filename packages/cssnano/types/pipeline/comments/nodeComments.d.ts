import type { AtRule, Declaration, Rule } from 'postcss';
import type { CanRemove } from './replaceComments.js';
import type { CSSToken } from '@csstools/css-tokenizer';
export type CommentState = {
    canRemove: CanRemove;
    parserCache: Map<string, CSSToken[]>;
};
/** @import {AtRule, Declaration, Rule} from 'postcss' */
/** @import {CanRemove} from './replaceComments.js' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * The comment removal of one stylesheet: the predicate that decides which
 * comments go, and the tokens parsed so far, shared by every node.
 * @typedef {{canRemove: CanRemove, parserCache: Map<string, CSSToken[]>}} CommentState
 */
/**
 * Removes the comments in the gap that a node keeps between its name and its
 * value or block. A custom property keeps its whitespace, and `: ` stands in
 * for it when every comment goes.
 *
 * @param {Declaration | Rule | AtRule} node
 * @param {CommentState} comments
 */
export declare function removeBetweenComments(node: Declaration | Rule | AtRule, comments: CommentState): void;
/**
 * The text of a value, prelude or selector without the comments that go.
 * Kept comments pass through, and a custom property keeps its whitespace.
 *
 * @param {string} text
 * @param {CommentState} comments
 * @param {boolean} [preserveWhitespace]
 * @returns {string}
 */
export declare function commentFreeText(text: string, comments: CommentState, preserveWhitespace?: boolean): string;
/**
 * Removes the comments from the `!important` flag, which keeps its own
 * spelling when it has none left.
 *
 * @param {Declaration} decl
 * @param {CommentState} comments
 */
export declare function removeImportantComments(decl: Declaration, comments: CommentState): void;
/**
 * The selector without the comments that go. Kept comments pass through, and
 * the selector parser sees the rest as PostCSS writes it.
 *
 * @param {string} text
 * @param {CommentState} comments
 * @returns {string}
 */
export declare function commentFreeSelector(text: string, comments: CommentState): string;
/**
 * Removes the comments between an at-rule name and its prelude. A name that
 * loses every comment keeps one space on each side.
 *
 * @param {AtRule} atRule
 * @param {CommentState} comments
 */
export declare function removeAfterNameComments(atRule: AtRule, comments: CommentState): void;
//# sourceMappingURL=nodeComments.d.ts.map