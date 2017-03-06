import {plugin, list} from 'postcss';
import CommentRemover from './lib/commentRemover';
import commentParser from './lib/commentParser';

const {space} = list;

export default plugin('postcss-discard-comments', (opts = {}) => {
    const remover = new CommentRemover(opts);

    function matchesComments (source) {
        return commentParser(source).filter(node => node.type === 'comment');
    }

    function replaceComments (source, separator = ' ') {
        const parsed = commentParser(source).reduce((value, node) => {
            if (node.type !== 'comment') {
                return value + node.value;
            }
            if (remover.canRemove(node.value)) {
                return value + separator;
            }
            return value + '/*' + node.value + '*/';
        }, '');

        return space(parsed).join(' ');
    }

    return css => {
        css.walk(node => {
            if (node.type === 'comment' && remover.canRemove(node.text)) {
                node.remove();
                return;
            }

            if (node.raws.between) {
                node.raws.between = replaceComments(node.raws.between);
            }

            if (node.type === 'decl') {
                if (node.raws.value && node.raws.value.raw) {
                    if (node.raws.value.value === node.value) {
                        node.value = replaceComments(node.raws.value.raw);
                    } else {
                        node.value = replaceComments(node.value);
                    }
                    node.raws.value = null;
                }
                if (node.raws.important) {
                    node.raws.important = replaceComments(node.raws.important);
                    const b = matchesComments(node.raws.important);
                    node.raws.important = b.length ? node.raws.important : '!important';
                }
                return;
            }

            if (node.type === 'rule' && node.raws.selector && node.raws.selector.raw) {
                node.raws.selector.raw = replaceComments(node.raws.selector.raw, '');
                return;
            }

            if (node.type === 'atrule') {
                if (node.raws.afterName) {
                    const commentsReplaced = replaceComments(node.raws.afterName);
                    if (!commentsReplaced.length) {
                        node.raws.afterName = commentsReplaced + ' ';
                    } else {
                        node.raws.afterName = ' ' + commentsReplaced + ' ';
                    }
                }
                if (node.raws.params && node.raws.params.raw) {
                    node.raws.params.raw = replaceComments(node.raws.params.raw);
                }
            }
        });
    };
});
