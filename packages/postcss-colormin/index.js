'use strict';

var colormin = require('colormin');
var postcss = require('postcss');
var parser = require('postcss-value-parser');
var stringify = parser.stringify;
var trim = parser.trim;

function optimise (decl) {
    if (/^(?!font|filter|-webkit-tap-highlight-color)/.test(decl.prop)) {
        decl.value = parser(decl.value).walk(function (node) {
            if (node.type === 'function') {
                if (/^(rgb|hsl)a?$/.test(node.value)) {
                    node.value = colormin(stringify(node));
                    node.type = 'word';
                } else {
                    trim(node.nodes);
                }
            } else if (node.type === 'div' && node.value !== '/') {
                node.before = '';
                node.after = '';
            } else if (node.type === 'space') {
                node.value = ' ';
            } else {
                node.value = colormin(node.value);
            }
        }).toString().trim();
    }
    if (decl.prop === '-webkit-tap-highlight-color') {
        if (decl.value === 'inherit' || decl.value === 'transparent') {
            return;
        }
        decl.value = parser(decl.value).walk(function (node) {
            if (node.type === 'function') {
                trim(node.nodes);
            } else if (node.type === 'div') {
                node.before = '';
                node.after = '';
            }
        }).toString();
    }
}

module.exports = postcss.plugin('postcss-colormin', function () {
    return function (css) {
        css.walkDecls(optimise);
    };
});
