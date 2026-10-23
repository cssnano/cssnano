import { TokenType } from '@csstools/css-tokenizer';
import {
  replaceComments,
  replaceCommentsInSelector,
} from './replaceComments.js';
import { getTokens } from './tokenUtils.js';

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
export function removeBetweenComments(node, comments) {
  const between = node.raws.between;
  if (typeof between !== 'string' || !between.includes('/*')) return;
  const preserveWhitespace = node.type === 'decl' && node.prop.startsWith('--');
  node.raws.between = replaceComments(
    between,
    comments.canRemove,
    comments.parserCache,
    ' ',
    preserveWhitespace
  );
  if (preserveWhitespace && !node.raws.between.includes('/*')) {
    node.raws.between = ': ';
  }
}

/**
 * The text of a value, prelude or selector without the comments that go.
 * Kept comments pass through, and a custom property keeps its whitespace.
 *
 * @param {string} text
 * @param {CommentState} comments
 * @param {boolean} [preserveWhitespace]
 * @returns {string}
 */
export function commentFreeText(text, comments, preserveWhitespace = false) {
  if (!text.includes('/*')) return text;
  return replaceComments(
    text,
    comments.canRemove,
    comments.parserCache,
    ' ',
    preserveWhitespace
  );
}

/**
 * Removes the comments from the `!important` flag, which keeps its own
 * spelling when it has none left.
 *
 * @param {Declaration} decl
 * @param {CommentState} comments
 */
export function removeImportantComments(decl, comments) {
  const important = decl.raws.important;
  if (!important || !important.includes('/*')) return;
  const cleaned = replaceComments(
    important,
    comments.canRemove,
    comments.parserCache
  );
  const hasComment = getTokens(cleaned, comments.parserCache).some(
    ([type]) => type === TokenType.Comment
  );
  decl.raws.important = hasComment ? cleaned : '!important';
}

/**
 * The selector without the comments that go. Kept comments pass through, and
 * the selector parser sees the rest as PostCSS writes it.
 *
 * @param {string} text
 * @param {CommentState} comments
 * @returns {string}
 */
export function commentFreeSelector(text, comments) {
  if (!text.includes('/*')) return text;
  return replaceCommentsInSelector(
    text,
    comments.canRemove,
    comments.parserCache
  );
}

/**
 * Removes the comments between an at-rule name and its prelude. A name that
 * loses every comment keeps one space on each side.
 *
 * @param {AtRule} atRule
 * @param {CommentState} comments
 */
export function removeAfterNameComments(atRule, comments) {
  const afterName = atRule.raws.afterName;
  if (!afterName || !afterName.includes('/*')) return;
  const replaced = replaceComments(
    afterName,
    comments.canRemove,
    comments.parserCache
  );
  atRule.raws.afterName = replaced === '' ? ' ' : ` ${replaced} `;
}
