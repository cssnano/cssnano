'use strict';
const CommentRemover = require('./lib/commentRemover');
const commentParser = require('./lib/commentParser');
const selectorParser = require('postcss-selector-parser');

/** @typedef {object} Options
 *  @property {boolean=} removeAll
 *  @property {boolean=} removeAllButFirst
 *  @property {(s: string) => boolean=} remove
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
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

    if (source.indexOf('/*') === -1) {
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
    if (source.indexOf('/*') === -1) {
      const normalized = space(source).join(' ');

      replacerCache.set(key, normalized);

      return normalized;
    }
    const processed = selectorParser((ast) => {
      ast.walk((node) => {
        if (node.type === 'comment') {
          const contents = node.value.slice(2, -2);
          if (remover.canRemove(contents)) {
            node.remove();
          }
        }
        const rawSpaceAfter = replaceComments(node.rawSpaceAfter, space, '');
        const rawSpaceBefore = replaceComments(node.rawSpaceBefore, space, '');
        // If comments are not removed, the result of trim will be returned,
        // so if we compare and there are no changes, skip it.
        if (rawSpaceAfter !== node.rawSpaceAfter.trim()) {
          node.rawSpaceAfter = rawSpaceAfter;
        }
        if (rawSpaceBefore !== node.rawSpaceBefore.trim()) {
          node.rawSpaceBefore = rawSpaceBefore;
        }
      });
    }).processSync(source);

    const result = space(processed).join(' ');

    replacerCache.set(key, result);

    return result;
  }

  return {
    postcssPlugin: 'postcss-discard-comments',

    OnceExit(css, { list }) {
      css.walk((node) => {
        if (node.type === 'comment' && remover.canRemove(node.text)) {
          node.remove();

          return;
        }

        if (typeof node.raws.between === 'string') {
          node.raws.between = replaceComments(node.raws.between, list.space);
        }

        if (node.type === 'decl') {
          if (node.raws.value && node.raws.value.raw) {
            if (node.raws.value.value === node.value) {
              node.value = replaceComments(node.raws.value.raw, list.space);
            } else {
              node.value = replaceComments(node.value, list.space);
            }

            /** @type {null | {value: string, raw: string}} */ (
              node.raws.value
            ) = null;
          }

          if (node.raws.important) {
            node.raws.important = replaceComments(
              node.raws.important,
              list.space
            );

            const b = matchesComments(node.raws.important);

            node.raws.important = b.length ? node.raws.important : '!important';
          } else {
            node.value = replaceComments(node.value, list.space);
          }

          return;
        }

        if (node.type === 'rule') {
          if (node.raws.selector && node.raws.selector.raw) {
            node.raws.selector.raw = replaceCommentsInSelector(
              node.raws.selector.raw,
              list.space
            );
          } else if (node.selector && node.selector.includes('/*')) {
            node.selector = replaceCommentsInSelector(
              node.selector,
              list.space
            );
          }

          return;
        }

        if (node.type === 'atrule') {
          if (node.raws.afterName) {
            const commentsReplaced = replaceComments(
              node.raws.afterName,
              list.space
            );

            if (!commentsReplaced.length) {
              node.raws.afterName = commentsReplaced + ' ';
            } else {
              node.raws.afterName = ' ' + commentsReplaced + ' ';
            }
          }

          if (node.raws.params && node.raws.params.raw) {
            node.raws.params.raw = replaceComments(
              node.raws.params.raw,
              list.space
            );
          } else if (node.params && node.params.includes('/*')) {
            node.params = replaceComments(node.params, list.space);
          }
        }
      });
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
