'use strict';

var postcss = require('postcss');
var parser = require('postcss-value-parser');

function canonical (obj) {
    return function recurse (key) {
        if (obj[key] && obj[key] !== key) {
            return recurse(obj[key]);
        }
        return key;
    };
}

function mergeAtRules (css, pairs) {
    pairs.forEach(function (pair) {
        pair.cache = [];
        pair.replacements = [];
        pair.decls = [];
    });

    var relevant;

    css.walk(function (node) {
        if (node.type === 'atrule') {
            relevant = pairs.filter(function (pair) {
                return pair.atrule.test(node.name);
            })[0];
            if (!relevant) { return; }
            var toString = node.nodes.toString();
            var cached = relevant.cache.filter(function (c) {
                return c.name === node.name && String(c.nodes) === toString;
            });
            var cache = relevant.cache;
            if (cached.length) {
                relevant.replacements[cached[0].params] = node.params;
                cached[0].remove();
                relevant.cache = cache.splice(cache.indexOf(cached[0]) + 1, 1);
            }
            relevant.cache.push(node);
        }
        if (node.type === 'decl') {
            relevant = pairs.filter(function (pair) {
                return pair.decl.test(node.prop);
            })[0];
            if (!relevant) { return; }
            relevant.decls.push(node);
        }
    });

    pairs.forEach(function (pair) {
        var canon = canonical(pair.replacements);
        pair.decls.forEach(function (decl) {
            decl.value = parser(decl.value).walk(function (node) {
                if (node.type === 'word') {
                    node.value = canon(node.value);
                }
                if (node.type === 'space') {
                    node.value = ' ';
                }
                if (node.type === 'div') {
                    node.before = '';
                    node.after = '';
                }
            }).toString();
        });
    });
}

module.exports = postcss.plugin('postcss-merge-idents', function () {
    return function (css) {
        mergeAtRules(css, [{
            atrule: /keyframes/,
            decl: /animation/
        }, {
            atrule: /counter-style/,
            decl: /(list-style|system)/
        }]);
    };
});
