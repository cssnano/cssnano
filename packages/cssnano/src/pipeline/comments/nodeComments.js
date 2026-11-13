import { tokenize } from '@csstools/css-tokenizer';
import {
  replaceComments,
  replaceCommentsInSelector,
} from './replaceComments.js';

/** @import {AtRule, Declaration, Rule} from 'postcss' */
/** @import {CanRemove} from './replaceComments.js' */
/** @import {Stage} from '../host.js' */

/**
 * The comment removal of one stylesheet: the predicate that decides which
 * comments go.
 * @typedef {{canRemove: CanRemove}} CommentState
 */

/**
 * The comment removal of a stylesheet, from the first stage that has one.
 *
 * @param {readonly Stage[]} stages
 * @returns {CommentState | null} null when no stage removes comments
 */
export function commentStateOf(stages) {
  for (const stage of stages) {
    if (stage.comments !== undefined) {
      return { canRemove: stage.comments() };
    }
  }
  return null;
}

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
    tokenize({ css: between }),
    comments.canRemove,
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
    tokenize({ css: text }),
    comments.canRemove,
    ' ',
    preserveWhitespace
  );
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
  return replaceCommentsInSelector(tokenize({ css: text }), comments.canRemove);
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
    tokenize({ css: afterName }),
    comments.canRemove
  );
  atRule.raws.afterName = replaced === '' ? ' ' : ` ${replaced} `;
}
