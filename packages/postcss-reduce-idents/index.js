'use strict';

var postcss = require('postcss');
var parser = require('postcss-value-parser');
var encode = require('./lib/encode');

function transformAtRule (css, atRuleRegex, propRegex) {
    var cache = {};
    var ruleCache = [];
    // Encode at rule names and cache the result
    css.walkAtRules(atRuleRegex, function (rule) {
        if (!cache[rule.params]) {
            cache[rule.params] = {
                ident: encode(Object.keys(cache).length),
                count: 0
            };
        }
        rule.params = cache[rule.params].ident;
        ruleCache.push(rule);
    });
    // Iterate each property and change their names
    css.walkDecls(propRegex, function (decl) {
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

module.exports = postcss.plugin('postcss-reduce-idents', function () {
    return function (css) {
        var cache = {};
        var declCache = [];
        css.walkDecls(/counter-(reset|increment)/, function (decl) {
            decl.value = parser(decl.value).walk(function (node) {
                if (node.type === 'word' && !/^-?\d*$/.test(node.value)) {
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
            declCache.push(decl);
        });
        css.walkDecls('content', function (decl) {
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
        declCache.forEach(function (decl) {
            decl.value = decl.value.walk(function (node) {
                if (node.type === 'word' && !/^-?\d*$/.test(node.value)) {
                    Object.keys(cache).forEach(function (key) {
                        var k = cache[key];
                        if (k.ident === node.value && !k.count) {
                            node.value = key;
                        }
                    });
                }
            }).toString();
        });
        // Transform @keyframes, @counter-style
        transformAtRule(css, /keyframes/, /animation/);
        transformAtRule(css, 'counter-style', /(list-style|system)/);
    };
});
