'use strict';

var uniqs = require('uniqs');
var postcss = require('postcss');
var flatten = require('flatten');
var comma = postcss.list.comma;
var space = postcss.list.space;

function filterAtRule (css, properties, atrule) {
    var atRules = [];
    var values = [];
    css.eachInside(function (node) {
        if (node.type === 'decl' && properties.test(node.prop)) {
            return comma(node.value).forEach(function (val) {
                values.push(space(val));
            });
        }
        if (node.type === 'atrule') {
            if (typeof atrule === 'string' && node.name === atrule) {
                atRules.push(node);
            } else if (atrule instanceof RegExp && atrule.test(node.name)) {
                atRules.push(node);
            }
        }
    });
    values = uniqs(flatten(values));
    atRules.forEach(function (node) {
        var hasAtRule = values.some(function (c) {
            return c === node.params;
        });
        if (!hasAtRule) {
            node.removeSelf();
        }
    });
}

module.exports = postcss.plugin('postcss-discard-unused', function () {
    return function (css) {
        // fonts have slightly different logic
        var atRules = [];
        var values = [];
        css.eachInside(function (node) {
            if (node.type === 'decl' &&
                node.parent.type === 'rule' &&
                /font(|-family)/.test(node.prop)
            ) {
                return values.push(comma(node.value));
            }
            if (node.type === 'atrule' && node.name === 'font-face' && node.nodes) {
                atRules.push(node);
            }
        });
        values = uniqs(flatten(values));
        atRules.forEach(function (rule) {
            var fontFamilies = rule.nodes.filter(function (node) {
                return node.prop === 'font-family';
            });
            // Discard the @font-face if it has no font-family
            if (!fontFamilies.length) {
                return rule.removeSelf();
            }
            fontFamilies.forEach(function (family) {
                var hasFont = comma(family.value).some(function (font) {
                    return values.some(function (c) {
                        return ~c.indexOf(font);
                    });
                });
                if (!hasFont) {
                    rule.removeSelf();
                }
            });
        });

        // keyframes & counter styles
        filterAtRule(css, /list-style|system/, 'counter-style');
        filterAtRule(css, /animation/, /keyframes/);
    };
});
