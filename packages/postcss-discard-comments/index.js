'use strict';

var balanced = require('node-balanced');
var CommentRemover = require('./lib/commentRemover');
var postcss = require('postcss');
var space = postcss.list.space;

module.exports = postcss.plugin('postcss-discard-comments', function (options) {
    return function (css) {
        var remover = new CommentRemover(options || {});

        function replaceComments (source) {
            if (!source) {
                return;
            }
            var b = balanced.replacements({
                source: source,
                open: '/*',
                close: '*/',
                replace: function (comment, head, tail) {
                    if (remover.canRemove(comment)) {
                        return ' ';
                    }
                    return head + comment + tail;
                }
            });
            return space(b).join(' ');
        }

        css.walk(function (node) {
            if (node.type === 'comment' && remover.canRemove(node.text)) {
                return node.remove();
            }

            if (node.raws.between) {
                node.raws.between = replaceComments(node.raws.between);
            }

            if (node.type === 'decl') {
                if (node.raws.value && node.raws.value.raw) {
                    var replaced = replaceComments(node.raws.value.raw);
                    node.raws.value.raw = node.raws.value.value = node.value = replaced;
                }
                if (node.raws.important) {
                    node.raws.important = replaceComments(node.raws.important);
                    var b = balanced.matches({
                        source: node.raws.important,
                        open: '/*',
                        close: '*/'
                    });
                    node.raws.important = b.length ? node.raws.important : '!important';
                }
                return;
            }

            if (node.type === 'rule' && node.raws.selector && node.raws.selector.raw) {
                node.raws.selector.raw = replaceComments(node.raws.selector.raw);
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
