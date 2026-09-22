import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import CommentRemover from './lib/commentRemover.js';
import {
  commentContents,
  getTokens,
  joinsIntoDifferentTokens,
} from './lib/tokenUtils.js';

const { asciiLowerCase, calcSumFunctions, decoded, mathFunctions } =
  cssnanoUtils;

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */

/** @typedef {object} Options
 *  @property {boolean=} removeAll
 *  @property {boolean=} removeAllButFirst
 *  @property {(s: string) => boolean=} remove
 */

// Functions whose argument grammar is <calc-sum>, requiring whitespace
// around '+' and '-' operators.
const calcSumArgumentFunctions = new Set([
  ...mathFunctions,
  ...calcSumFunctions,
]);

// calc() syntax requires whitespace around these operators.
const mathOperators = new Set(['+', '-']);

/**
 * Flag tokens by whether they sit inside a math function argument list.
 *
 * @param {CSSToken[]} tokens
 * @return {boolean[]}
 */
function mathContexts(tokens) {
  /** @type {boolean[]} */
  const contexts = [];
  let depth = 0;

  /** @type {boolean[]} */
  const stack = [];

  for (const token of tokens) {
    const type = token[0];

    if (type === TokenType.Function) {
      // Function tokens may spell names with escapes; the decoded value
      // resolves both.
      const isMathFunction = calcSumArgumentFunctions.has(
        asciiLowerCase(decoded(token))
      );
      stack.push(isMathFunction);

      if (isMathFunction) {
        depth++;
      }
    } else if (type === TokenType.OpenParen) {
      // A bare parenthesis inherits the math context but owns no depth
      // increment.
      stack.push(false);
    } else if (type === TokenType.CloseParen) {
      if (stack.pop()) {
        depth--;
      }
    }

    contexts.push(depth > 0);
  }

  return contexts;
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
  const inMathFunction = mathContexts(tokens);
  let result = '';
  let pendingSpace = false;
  let started = false;

  for (const [index, [type, raw]] of tokens.entries()) {
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
    if (
      inMathFunction[index] &&
      type === TokenType.Delim &&
      mathOperators.has(raw)
    ) {
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
function replaceComments(
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
function replaceCommentsInSelector(rawSource, remover, parserCache) {
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
    if (removedCommentBefore && type === TokenType.Comma) {
      pendingSpace = false;
    }

    // A removed comment separated its neighbors; fuse them only if they
    // re-tokenize identically.
    if (
      removedCommentBefore &&
      started &&
      !pendingSpace &&
      joinsIntoDifferentTokens(lastRaw, raw, parserCache)
    ) {
      pendingSpace = true;
    }

    if (pendingSpace && started) {
      result += ' ';
    }
    pendingSpace = false;
    result += raw;
    started = true;
    lastRaw = raw;
    removedCommentBefore = false;
  }

  return result;
}

/**
 * @param {import('postcss').Declaration} node
 * @param {CommentRemover} remover
 * @param {Map<string, CSSToken[]>} parserCache
 */
function processDeclaration(node, remover, parserCache) {
  const preserveWhitespace = node.prop.startsWith('--');

  // Raw value metadata is authoritative only while it still mirrors the
  // value; a previous plugin may have changed the value underneath it.
  const rawValue = node.raws.value?.raw ? node.raws.value : null;
  const rawMirrorsValue = rawValue !== null && rawValue.value === node.value;

  if (rawValue && rawValue.raw.includes('/*')) {
    node.value = replaceComments(
      rawMirrorsValue ? rawValue.raw : node.value,
      remover,
      parserCache,
      ' ',
      preserveWhitespace
    );

    /** @type {null | {value: string, raw: string}} */ (node.raws.value) = null;
  } else if (node.value.includes('/*')) {
    node.value = replaceComments(
      node.value,
      remover,
      parserCache,
      ' ',
      preserveWhitespace
    );

    if (rawValue) {
      // The raw captured an earlier value and must not outlive it.
      /** @type {null | {value: string, raw: string}} */ (node.raws.value) =
        null;
    }
  }

  if (node.raws.important && node.raws.important.includes('/*')) {
    node.raws.important = replaceComments(
      node.raws.important,
      remover,
      parserCache
    );

    const hasComment = getTokens(
      /** @type {string} */ (node.raws.important),
      parserCache
    ).some(([type]) => type === TokenType.Comment);

    if (!hasComment) {
      node.raws.important = '!important';
    }
  }
}

/**
 * @param {import('postcss').Rule} node
 * @param {CommentRemover} remover
 * @param {Map<string, CSSToken[]>} parserCache
 */
function processRule(node, remover, parserCache) {
  if (node.raws.selector && node.raws.selector.raw) {
    if (node.raws.selector.raw.includes('/*')) {
      node.raws.selector.raw = replaceCommentsInSelector(
        node.raws.selector.raw,
        remover,
        parserCache
      );
    }
  } else if (node.selector && node.selector.includes('/*')) {
    node.selector = replaceCommentsInSelector(
      node.selector,
      remover,
      parserCache
    );
  }
}

/**
 * @param {import('postcss').AtRule} node
 * @param {CommentRemover} remover
 * @param {Map<string, CSSToken[]>} parserCache
 */
function processAtRule(node, remover, parserCache) {
  if (node.raws.afterName && node.raws.afterName.includes('/*')) {
    const commentsReplaced = replaceComments(
      node.raws.afterName,
      remover,
      parserCache
    );

    if (!commentsReplaced.length) {
      node.raws.afterName = commentsReplaced + ' ';
    } else {
      node.raws.afterName = ' ' + commentsReplaced + ' ';
    }
  }

  if (node.raws.params && node.raws.params.raw) {
    if (node.raws.params.raw.includes('/*')) {
      node.raws.params.raw = replaceComments(
        node.raws.params.raw,
        remover,
        parserCache
      );
    }
  } else if (node.params && node.params.includes('/*')) {
    node.params = replaceComments(node.params, remover, parserCache);
  }
}

/**
 * @param {import('postcss').ChildNode} node
 * @param {CommentRemover} remover
 * @param {Map<string, CSSToken[]>} parserCache
 */
function processNode(node, remover, parserCache) {
  if (node.type === 'comment' && remover.canRemove(node.text)) {
    node.remove();

    return;
  }

  if (
    typeof node.raws.between === 'string' &&
    node.raws.between.includes('/*')
  ) {
    const preserveWhitespace =
      node.type === 'decl' && node.prop.startsWith('--');

    node.raws.between = replaceComments(
      node.raws.between,
      remover,
      parserCache,
      ' ',
      preserveWhitespace
    );

    if (preserveWhitespace && !node.raws.between.includes('/*')) {
      node.raws.between = ': ';
    }
  }

  if (node.type === 'decl') {
    processDeclaration(node, remover, parserCache);
  } else if (node.type === 'rule') {
    processRule(node, remover, parserCache);
  } else if (node.type === 'atrule') {
    processAtRule(node, remover, parserCache);
  }
}

/**
 * @param {Options} [opts]
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-discard-comments',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      // Removal decisions are stateful and parsing is pure, so neither is
      // cached across traversals.
      const remover = new CommentRemover(opts);
      const parserCache = new Map();

      css.walk((node) => processNode(node, remover, parserCache));
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
