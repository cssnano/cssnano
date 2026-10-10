import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import {
  commentContents,
  getTokens,
  joinsIntoDifferentTokens,
} from './tokenUtils.js';

const { asciiLowerCase, calcSumFunctions, decoded, mathFunctions } =
  cssnanoUtils;

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @typedef {import('./commentRemover.js').default} CommentRemover */

// Functions whose argument grammar is <calc-sum>, requiring whitespace
// around '+' and '-' operators.
const calcSumArgumentFunctions = new Set([
  ...mathFunctions.keys(),
  ...calcSumFunctions,
]);

// calc() syntax requires whitespace around these operators.
const mathOperators = new Set(['+', '-']);

/**
 * Track entry into and exit from math function argument lists, whose
 * <calc-sum> grammar requires whitespace around `+` and `-`.
 *
 * @param {boolean[]} parens one entry per open parenthesis: whether it opened a math function
 * @param {CSSToken} token
 * @return {number} change in math function nesting depth
 */
function mathDepthChange(parens, token) {
  const type = token[0];

  if (type === TokenType.Function) {
    // Function tokens may spell names with escapes; the decoded value
    // resolves both.
    const isMathFunction = calcSumArgumentFunctions.has(
      asciiLowerCase(decoded(token))
    );
    parens.push(isMathFunction);
    return isMathFunction ? 1 : 0;
  }

  if (type === TokenType.OpenParen) {
    // A bare parenthesis inherits the math context but owns no depth.
    parens.push(false);
  } else if (type === TokenType.CloseParen && parens.pop()) {
    return -1;
  }

  return 0;
}

/**
 * Reconstruct an ordinary value with comments removed or preserved,
 * normalizing whitespace and math operator spacing.
 *
 * @param {string} source
 * @param {CommentRemover} remover
 * @param {Map<string, CSSToken[]>} parserCache
 * @return {string}
 */
function normalizeValue(source, remover, parserCache) {
  const tokens = getTokens(source, parserCache);
  let result = '';
  let pendingSpace = false;
  let started = false;
  let mathDepth = 0;

  /** @type {boolean[]} */
  const parens = [];

  for (const token of tokens) {
    const [type, raw] = token;

    mathDepth += mathDepthChange(parens, token);

    if (type === TokenType.EOF) {
      continue;
    }

    if (type === TokenType.Whitespace) {
      if (started) {
        pendingSpace = true;
      }
      continue;
    }

    if (type === TokenType.Comment && remover.canRemove(commentContents(raw))) {
      pendingSpace = started;
      continue;
    }

    // A removed comment must not leave operands touching a math operator.
    if (mathDepth > 0 && type === TokenType.Delim && mathOperators.has(raw)) {
      if (started && !result.endsWith(' ') && !result.endsWith('(')) {
        result += ' ';
      }

      result += raw;
      pendingSpace = true;
      started = true;
      continue;
    }

    // Closing punctuation and commas absorb pending whitespace; openers
    // suppress a leading gap.
    if (
      type === TokenType.CloseParen ||
      type === TokenType.CloseSquare ||
      type === TokenType.Comma
    ) {
      pendingSpace = false;
    }

    if (
      pendingSpace &&
      started &&
      !result.endsWith('(') &&
      !result.endsWith('[')
    ) {
      result += ' ';
    }
    pendingSpace = false;
    result += raw;
    started = true;
  }

  return result;
}

/**
 * Reconstruct a value with comments removed or preserved. Kept comments
 * pass through byte-exact; removal decisions consult the per-document
 * remover.
 *
 * @param {string | undefined} rawSource
 * @param {CommentRemover} remover
 * @param {Map<string, CSSToken[]>} parserCache
 * @param {string=} separator
 * @param {boolean=} preserveWhitespace
 * @return {string}
 */
export function replaceComments(
  rawSource,
  remover,
  parserCache,
  separator = ' ',
  preserveWhitespace = false
) {
  const source = rawSource || '';

  if (!source.includes('/*')) {
    return source;
  }

  if (preserveWhitespace) {
    // Custom property values keep their whitespace byte-for-byte.
    let preserved = '';

    for (const [type, raw] of getTokens(source, parserCache)) {
      if (type === TokenType.EOF) {
        continue;
      }

      if (
        type === TokenType.Comment &&
        remover.canRemove(commentContents(raw))
      ) {
        preserved += separator;
        continue;
      }

      preserved += raw;
    }

    return preserved;
  }

  return normalizeValue(source, remover, parserCache);
}

/**
 * Reconstruct a selector with comments removed or preserved. Whitespace
 * runs collapse to a single space and trim at the edges; kept comments
 * pass through byte-exact.
 *
 * @param {string | undefined} rawSource
 * @param {CommentRemover} remover
 * @param {Map<string, CSSToken[]>} parserCache
 * @return {string}
 */
export function replaceCommentsInSelector(rawSource, remover, parserCache) {
  const source = rawSource || '';

  if (!source.includes('/*')) {
    return source;
  }

  let result = '';
  let pendingSpace = false;
  let started = false;
  let removedCommentBefore = false;
  let lastRaw = '';

  for (const [type, raw] of getTokens(source, parserCache)) {
    if (type === TokenType.EOF) {
      continue;
    }

    if (type === TokenType.Whitespace) {
      if (started) {
        pendingSpace = true;
      }
      continue;
    }

    if (type === TokenType.Comment) {
      if (remover.canRemove(commentContents(raw))) {
        removedCommentBefore = true;
        continue;
      }

      if (pendingSpace && started) {
        result += ' ';
      }
      pendingSpace = false;
      result += raw;
      started = true;
      lastRaw = raw;
      removedCommentBefore = false;
      continue;
    }

    // Selector-parser drops whitespace immediately before a comma when a
    // preceding comment is removed. Keep that punctuation normalization
    // while leaving whitespace around combinators intact.
    pendingSpace &&= !(removedCommentBefore && type === TokenType.Comma);

    // A removed comment is not whitespace: where fusing its neighbors would
    // change their tokens, an empty comment keeps the original token stream,
    // whereas a space could add a descendant combinator.
    let separator = '';
    if (started) {
      if (pendingSpace) {
        separator = ' ';
      } else if (
        removedCommentBefore &&
        joinsIntoDifferentTokens(lastRaw, raw, parserCache)
      ) {
        separator = '/**/';
      }
    }

    result += separator;
    pendingSpace = false;
    result += raw;
    started = true;
    lastRaw = raw;
    removedCommentBefore = false;
  }

  return result;
}
