'use strict';

var hasOwn = require('has-own');
var postcss = require('postcss');
var valueParser = require('postcss-value-parser');

function canonical (obj) {
    return function recurse (key) {
        if (hasOwn(key, obj) && obj[key] !== key) {
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
            if (!relevant) {
                return;
            }
            if (relevant.cache.length < 1) {
                relevant.cache.push(node);
                return;
            } else {
                var toString = node.nodes.toString();
                relevant.cache.forEach(function (cached) {
                    if (cached.name === node.name && cached.nodes.toString() === toString) {
                        cached.remove();
                        relevant.replacements[cached.params] = node.params;
                    }
                });
                relevant.cache.push(node);
                return;
            }
        }
        if (node.type === 'decl') {
            relevant = pairs.filter(function (pair) {
                return pair.decl.test(node.prop);
            })[0];
            if (!relevant) {
                return;
            }
            relevant.decls.push(node);
        }
    });

    pairs.forEach(function (pair) {
        var canon = canonical(pair.replacements);
        pair.decls.forEach(function (decl) {
            decl.value = valueParser(decl.value).walk(function (node) {
                if (node.type === 'word') {
                    node.value = canon(node.value);
                }
                if (node.type === 'space') {
                    node.value = ' ';
                }
                if (node.type === 'div') {
                    node.before = node.after = '';
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
