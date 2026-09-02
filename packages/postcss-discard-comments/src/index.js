import CommentRemover from './lib/commentRemover.js';
import commentParser from './lib/commentParser.js';

const selectorWhitespace = new Set(['\t', '\n', '\f', '\r', ' ']);

/**
 * @param {string} value
 * @return {boolean}
 */
function isSelectorWhitespace(value) {
  return selectorWhitespace.has(value);
}

/**
 * @param {string[]} parts
 */
function trimTrailingSelectorWhitespace(parts) {
  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index];
    let end = part.length;

    while (end > 0 && isSelectorWhitespace(part[end - 1])) {
      end--;
    }

    if (end !== part.length) {
      parts[index] = part.slice(0, end);
      continue;
    }

    if (part.length) {
      return;
    }
  }
}

/** @typedef {object} Options
 *  @property {boolean=} removeAll
 *  @property {boolean=} removeAllButFirst
 *  @property {(s: string) => boolean=} remove
 */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  const remover = new CommentRemover(opts);
  const matcherCache = new Map();
  const parserCache = new Map();
  const replacerCache = new Map();

  /**
   * @param {string} source
   * @return {[number, number, number][]}
   */
  function getTokens(source) {
    if (parserCache.has(source)) {
      return parserCache.get(source);
    }

    const tokens = commentParser(source);

    parserCache.set(source, tokens);

    return tokens;
  }

  /**
   * @param {string} source
   * @return {[number, number, number][]}
   */
  function matchesComments(source) {
    if (matcherCache.has(source)) {
      return matcherCache.get(source);
    }

    const result = getTokens(source).filter(([type]) => type);

    matcherCache.set(source, result);

    return result;
  }

  /**
   * @param {string | undefined} rawSource
   * @param {(s: string) => string[]} space
   * @param {string=} separator
   * @return {string}
   */
  function replaceComments(rawSource, space, separator = ' ') {
    const source = rawSource || '';
    const key = source + '@|@' + separator;

    if (replacerCache.has(key)) {
      return replacerCache.get(key);
    }

    if (!source.includes('/*')) {
      const normalized = space(source).join(' ');

      replacerCache.set(key, normalized);

      return normalized;
    }

    const parts = [];

    for (const [type, start, end] of getTokens(source)) {
      if (!type) {
        parts.push(source.slice(start, end));
        continue;
      }

      const contents = source.slice(start, end);

      if (remover.canRemove(contents)) {
        parts.push(separator);
        continue;
      }

      parts.push('/*' + contents + '*/');
    }

    const parsed = parts.join('');

    const result = space(parsed).join(' ');

    replacerCache.set(key, result);

    return result;
  }

  /**
   * @param {string | undefined} rawSource
   * @param {(s: string) => string[]} space
   * @return {string}
   */
  function replaceCommentsInSelector(rawSource, space) {
    const source = rawSource || '';
    const key = source + '@|@';

    if (replacerCache.has(key)) {
      return replacerCache.get(key);
    }
    if (!source.includes('/*')) {
      const normalized = space(source).join(' ');

      replacerCache.set(key, normalized);

      return normalized;
    }
    const parts = [];
    let removedCommentBeforeComma = false;

    for (const [type, start, end] of getTokens(source)) {
      if (!type) {
        let part = source.slice(start, end);

        if (removedCommentBeforeComma) {
          let offset = 0;

          while (offset < part.length && isSelectorWhitespace(part[offset])) {
            offset++;
          }

          if (part[offset] === ',') {
            trimTrailingSelectorWhitespace(parts);
            part = part.slice(offset);
          }
        }

        parts.push(part);
        removedCommentBeforeComma = false;
        continue;
      }

      const contents = source.slice(start, end);

      if (!remover.canRemove(contents)) {
        parts.push('/*' + contents + '*/');
        removedCommentBeforeComma = false;
      } else {
        removedCommentBeforeComma = true;
      }
    }

    // Selector-parser drops whitespace immediately before a comma when a
    // preceding comment is removed. Keep that punctuation normalization while
    // leaving whitespace around combinators intact.
    const processed = parts.join('');

    const result = space(processed).join(' ');

    replacerCache.set(key, result);

    return result;
  }

  /**
   * @param {import('postcss').Declaration} node
   * @param {(s: string) => string[]} space
   */
  function processDeclaration(node, space) {
    if (node.raws.value && node.raws.value.raw) {
      if (node.raws.value.value === node.value) {
        node.value = replaceComments(node.raws.value.raw, space);
      } else {
        node.value = replaceComments(node.value, space);
      }

      /** @type {null | {value: string, raw: string}} */ (node.raws.value) =
        null;
    }

    if (node.raws.important) {
      node.raws.important = replaceComments(node.raws.important, space);

      const b = matchesComments(node.raws.important);

      node.raws.important = b.length ? node.raws.important : '!important';
    } else {
      node.value = replaceComments(node.value, space);
    }
  }

  /**
   * @param {import('postcss').Rule} node
   * @param {(s: string) => string[]} space
   */
  function processRule(node, space) {
    if (node.raws.selector && node.raws.selector.raw) {
      node.raws.selector.raw = replaceCommentsInSelector(
        node.raws.selector.raw,
        space
      );
    } else if (node.selector && node.selector.includes('/*')) {
      node.selector = replaceCommentsInSelector(node.selector, space);
    }
  }

  /**
   * @param {import('postcss').AtRule} node
   * @param {(s: string) => string[]} space
   */
  function processAtRule(node, space) {
    if (node.raws.afterName) {
      const commentsReplaced = replaceComments(node.raws.afterName, space);

      if (!commentsReplaced.length) {
        node.raws.afterName = commentsReplaced + ' ';
      } else {
        node.raws.afterName = ' ' + commentsReplaced + ' ';
      }
    }

    if (node.raws.params && node.raws.params.raw) {
      node.raws.params.raw = replaceComments(node.raws.params.raw, space);
    } else if (node.params && node.params.includes('/*')) {
      node.params = replaceComments(node.params, space);
    }
  }

  /**
   * @param {import('postcss').ChildNode} node
   * @param {(s: string) => string[]} space
   */
  function processNode(node, space) {
    if (node.type === 'comment' && remover.canRemove(node.text)) {
      node.remove();

      return;
    }

    if (typeof node.raws.between === 'string') {
      node.raws.between = replaceComments(node.raws.between, space);
    }

    if (node.type === 'decl') {
      processDeclaration(node, space);
    } else if (node.type === 'rule') {
      processRule(node, space);
    } else if (node.type === 'atrule') {
      processAtRule(node, space);
    }
  }

  return {
    postcssPlugin: 'postcss-discard-comments',
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { list }) {
      css.walk((node) => processNode(node, list.space));
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
