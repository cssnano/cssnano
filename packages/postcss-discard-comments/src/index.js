import { plugin, list } from 'postcss';
import * as R from 'ramda';
import cacheFn from './lib/cacheFn';
import CommentRemover from './lib/commentRemover';
import commentParser from './lib/commentParser';

const { space } = list;

const commentCount = cacheFn(
  R.compose(
    R.length,
    R.filter(R.head),
    commentParser
  )
);

const normalizeRawImportant = R.unless(commentCount, () => '!important');

export default plugin('postcss-discard-comments', (opts = {}) => {
  const remover = new CommentRemover(opts);

  const replaceComments = cacheFn((separator, source) => {
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

    return space(parsed).join(' ');
  });

  return (css) => {
    css.walk((node) => {
      if (node.type === 'comment' && remover.canRemove(node.text)) {
        node.remove();

        return;
      }

      const rawBetween = R.path(['raws', 'between'], node);

      if (rawBetween) {
        node.raws.between = replaceComments(' ', rawBetween);
      }

      if (node.type === 'decl') {
        const rawValue = R.path(['raws', 'value', 'raw'], node);

        if (rawValue) {
          node.value =
            node.raws.value.value === node.value
              ? replaceComments(' ', rawValue)
              : replaceComments(' ', node.value);

          node.raws.value = null;
        }

        const rawImportant = R.path(['raws', 'important'], node);

        if (rawImportant) {
          node.raws.important = normalizeRawImportant(
            replaceComments(' ', rawImportant)
          );
        }

        return;
      }

      const rawSelector = R.path(['raws', 'selector', 'raw'], node);

      if (node.type === 'rule' && rawSelector) {
        node.raws.selector.raw = replaceComments('', rawSelector);

        return;
      }

      if (node.type === 'atrule') {
        if (node.raws.afterName) {
          const commentsReplaced = replaceComments(' ', node.raws.afterName);

          node.raws.afterName = commentsReplaced.length
            ? ` ${commentsReplaced} `
            : `${commentsReplaced} `;
        }

        const rawParams = R.path(['raws', 'params', 'raw'], node);

        if (rawParams) {
          node.raws.params.raw = replaceComments(' ', rawParams);
        }
      }
    });
  };
});
