'use strict';

var colormin = require('colormin');
var postcss = require('postcss');
var color = require('color');
var trim = require('colormin/dist/lib/stripWhitespace');
var parser = require('postcss-value-parser');

module.exports = postcss.plugin('postcss-colormin', function () {
    return function (css) {
        css.walkDecls(function (decl) {
            if (/^(?!font|filter|-webkit-tap-highlight-color)/.test(decl.prop)) {
                decl.value = parser(decl.value).walk(function (node) {
                    if (node.type === 'function') {
                        if (/^(rgb|hsl)a?$/.test(node.value)) {
                            node.value = colormin(parser.stringify(node));
                            node.type = 'word';
                        } else {
                            parser.trim(node.nodes);
                        }
                    } else if (node.type === 'div') {
                        node.before = '';
                        node.after = '';
                    } else if (node.type === 'space') {
                        node.value = ' ';
                    } else {
                        node.value = colormin(node.value);
                    }
                }).toString();
            }
            if (decl.prop === '-webkit-tap-highlight-color') {
                if (decl.value === 'inherit' || decl.value === 'transparent') {
                    return;
                }
                decl.value = trim(color(decl.value).rgbString());
            }
        });
    };
});
