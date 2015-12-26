'use strict';

var CommentRemover = require('./lib/commentRemover');
var commentParser = require('./lib/commentParser');
var postcss = require('postcss');
var space = postcss.list.space;

module.exports = postcss.plugin('postcss-discard-comments', function (opts) {
    var remover = new CommentRemover(opts || {});

    function matchesComments (source) {
        return commentParser(source).filter(function (node) {
            return node.type === 'comment';
        });
    }

    function replaceComments (source, separator) {
        if (!source) {
            return;
        }
        if (typeof separator === 'undefined') {
            separator = ' ';
        }
        var parsed = commentParser(source).reduce(function (value, node) {
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

    return function (css) {
        css.walk(function (node) {
            if (node.type === 'comment' && remover.canRemove(node.text)) {
                return node.remove();
            }

            if (node.raws.between) {
                node.raws.between = replaceComments(node.raws.between);
            }

            if (node.type === 'decl') {
                if (node.raws.value && node.raws.value.raw) {
                    if (node.raws.value.value === node.value) {
                        var replaced = replaceComments(node.raws.value.raw);
                        node.value = replaced;
                    } else {
                        node.value = replaceComments(node.value);
                    }
                    delete node.raws.value;
                }
                if (node.raws.important) {
                    node.raws.important = replaceComments(node.raws.important);
                    var b = matchesComments(node.raws.important);
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
                    var commentsReplaced = replaceComments(node.raws.afterName);
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
