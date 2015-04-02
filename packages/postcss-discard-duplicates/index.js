'use strict';

var postcss = require('postcss');

function getIdent (rule) {
    return '' + rule;
}

function filterIdent (cache) {
    return function (node) {
        // Ensure we don't dedupe in different contexts
        var sameContext = node.parent.type === cache.parent.type;
        return sameContext && getIdent(node) === getIdent(cache);
    };
}

function dedupe () {
    var cache = [];
    return function (rule) {
        var cached = cache.filter(filterIdent(rule));
        if (cached.length) {
            cached[0].removeSelf();
            cache.splice([cache.indexOf(cached[0])], 1);
        }
        cache.push(rule);
    };
}

module.exports = postcss.plugin('postcss-discard-duplicates', function () {
    return function (css) {
        css.eachAtRule(dedupe());
        css.eachRule(function (rule) {
            rule.eachInside(dedupe());
        });
        css.eachRule(dedupe());
    };
});
