import CommentRemover from './lib/commentRemover';
import commentParser from './lib/commentParser';

const postcssPlugin = 'postcss-discard-comments';

const pluginCreator = (opts = {}) => {
  const remover = new CommentRemover(opts);
  const matcherCache = {};
  const replacerCache = {};

  function matchesComments(source) {
    if (matcherCache[source]) {
      return matcherCache[source];
    }

    const result = commentParser(source).filter(([type]) => type);

    matcherCache[source] = result;

    return result;
  }

  function replaceComments(source, space, separator = ' ') {
    const key = source + '@|@' + separator;

    if (replacerCache[key]) {
      return replacerCache[key];
    }

    const parsed = commentParser(source).reduce((value, [type, start, end]) => {
      const contents = source.slice(start, end);

      if (!type) {
        return value + contents;
      }

      if (remover.canRemove(contents)) {
        return value + separator;
      }

      return `${value}/*${contents}*/`;
    }, '');

    const result = space(parsed).join(' ');

    replacerCache[key] = result;

    return result;
  }

  function transform(node, { list }) {
    const { space } = list;
    if (node.type === 'comment' && remover.canRemove(node.text)) {
      node.remove();

      return;
    }

    if (node.raws.between) {
      node.raws.between = replaceComments(node.raws.between, space);
    }

    if (node.type === 'decl') {
      if (node.raws.value && node.raws.value.raw) {
        if (node.raws.value.value === node.value) {
          node.value = replaceComments(node.raws.value.raw, space);
        } else {
          node.value = replaceComments(node.value, space);
        }

        node.raws.value = null;
      }

      if (node.raws.important) {
        node.raws.important = replaceComments(node.raws.important, space);

        const b = matchesComments(node.raws.important);

        node.raws.important = b.length ? node.raws.important : '!important';
      }

      return;
    }

    if (node.type === 'rule' && node.raws.selector && node.raws.selector.raw) {
      node.raws.selector.raw = replaceComments(
        node.raws.selector.raw,
        space,
        ''
      );

      return;
    }

    if (node.type === 'atrule') {
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
      }
    }
  }

  return {
    postcssPlugin,
    Root: transform,
    Declaration: transform,
    Rule: transform,
    Comment: transform,
    AtRule: transform,
  };
};

pluginCreator.postcss = true;

export default pluginCreator;
