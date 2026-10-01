import { TokenType } from '@csstools/css-tokenizer';
import CommentRemover from './lib/commentRemover.js';
import { getTokens } from './lib/tokenUtils.js';
import {
  replaceComments,
  replaceCommentsInSelector,
} from './lib/replaceComments.js';

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */

/** @typedef {object} Options
 *  @property {boolean=} removeAll
 *  @property {boolean=} removeAllButFirst
 *  @property {(s: string) => boolean=} remove
 */

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
