'use strict';

var postcss = require('postcss');
var parser = require('postcss-value-parser');
var encode = require('./lib/encode');

function isNum (node) {
    return parser.unit(node.value);
}

function transformAtRule (css, atRuleRegex, propRegex) {
    var cache = {};
    var ruleCache = [];
    var declCache = [];
    // Encode at rule names and cache the result
    css.walk(function (node) {
        if (node.type === 'atrule' && atRuleRegex.test(node.name)) {
            if (!cache[node.params]) {
                cache[node.params] = {
                    ident: encode(Object.keys(cache).length),
                    count: 0
                };
            }
            node.params = cache[node.params].ident;
            ruleCache.push(node);
        }
        if (node.type === 'decl' && propRegex.test(node.prop)) {
            declCache.push(node);
        }
    });
    // Iterate each property and change their names
    declCache.forEach(function (decl) {
        decl.value = parser(decl.value).walk(function (node) {
            if (node.type === 'word' && node.value in cache) {
                cache[node.value].count++;
                node.value = cache[node.value].ident;
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
    // Ensure that at rules with no references to them are left unchanged
    ruleCache.forEach(function (rule) {
        Object.keys(cache).forEach(function (key) {
            var k = cache[key];
            if (k.ident === rule.params && !k.count) {
                rule.params = key;
            }
        });
    });
}

function transformDecl (css, propOneRegex, propTwoRegex) {
    var cache = {};
    var declOneCache = [];
    var declTwoCache = [];
    css.walkDecls(function (decl) {
        if (propOneRegex.test(decl.prop)) {
            decl.value = parser(decl.value).walk(function (node) {
                if (node.type === 'word' && !isNum(node)) {
                    if (!cache[node.value]) {
                        cache[node.value] = {
                            ident: encode(Object.keys(cache).length),
                            count: 0
                        };
                    }
                    node.value = cache[node.value].ident;
                }
                if (node.type === 'space') {
                    node.value = ' ';
                }
            });
            declOneCache.push(decl);
        }
        if (propTwoRegex.test(decl.prop)) {
            declTwoCache.push(decl);
        }
    });
    declTwoCache.forEach(function (decl) {
        decl.value = parser(decl.value).walk(function (node) {
            if (node.type === 'function') {
                if (node.value === 'counter' || node.value === 'counters') {
                    node.nodes.forEach(function (node) {
                        if (node.type === 'word' && node.value in cache) {
                            cache[node.value].count++;
                            node.value = cache[node.value].ident;
                        }
                        if (node.type === 'div') {
                            node.before = '';
                            node.after = '';
                        }
                    });
                }
                return false;
            }
            if (node.type === 'space') {
                node.value = ' ';
            }
        }).toString();
    });
    declOneCache.forEach(function (decl) {
        decl.value = decl.value.walk(function (node) {
            if (node.type === 'word' && !isNum(node)) {
                Object.keys(cache).forEach(function (key) {
                    var k = cache[key];
                    if (k.ident === node.value && !k.count) {
                        node.value = key;
                    }
                });
            }
        }).toString();
    });
}

module.exports = postcss.plugin('postcss-reduce-idents', function (opts) {
    opts = opts || {};
    return function (css) {
        if (opts.counter !== false) {
            transformDecl(css, /counter-(reset|increment)/, /content/);
        }
        if (opts.keyframes !== false) {
            transformAtRule(css, /keyframes/, /animation/);
        }
        if (opts.counterStyle !== false) {
            transformAtRule(css, /counter-style/, /(list-style|system)/);
        }
    };
});
