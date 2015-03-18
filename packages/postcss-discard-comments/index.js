'use strict';

var list = require('postcss/lib/list');
var balanced = require('node-balanced');
var CommentRemover = require('./lib/commentRemover');

module.exports = function (options) {
    var remover = new CommentRemover(options);
    var hasFirst = false;
    options = options || {};

    function replaceComments (source) {
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
        return list.space(b).join(' ');
    }

    return function (css) {
        css.eachComment(function (comment) {
            if (remover.canRemove(comment.text)) {
                comment.removeSelf();
            }
        });

        css.eachDecl(function (decl) {
            decl.between = replaceComments(decl.between);
            if (decl._value && decl._value.raw) {
                decl._value.raw = replaceComments(decl._value.raw);
            }
        });

        css.eachRule(function (rule) {
            if (rule.between) {
                rule.between = replaceComments(rule.between);
            }
            if (rule._selector && rule._selector.raw) {
                rule._selector.raw = replaceComments(rule._selector.raw);
            }
        });

        css.eachAtRule(function (rule) {
            var commentsReplaced = replaceComments(rule.afterName);
            if (!commentsReplaced.length) {
                rule.afterName = commentsReplaced + ' ';
            } else {
                rule.afterName = ' ' + commentsReplaced + ' ';
            }
            if (rule._params && rule._params.raw) {
                rule._params.raw = replaceComments(rule._params.raw);
            }
            if (rule.between) {
                rule.between = replaceComments(rule.between);
            }
        });
    }
};
