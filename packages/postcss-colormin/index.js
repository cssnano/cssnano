'use strict';

var colormin = require('colormin');
var postcss = require('postcss');
var list = postcss.list;
var reduce = require('reduce-function-call');

function eachVal (values) {
    return list.comma(values).map(function (value) {
        return list.space(value).map(colormin).join(' ');
    }).join(',');
}

module.exports = postcss.plugin('postcss-colormin', function () {
    return function (css) {
        css.eachDecl(/^(?!font)/, function (decl) {
            decl.value = eachVal(decl.value);
            decl.value = reduce(decl.value, 'gradient', function (body, fn) {
                return fn + '(' + list.comma(body).map(eachVal).join(',') + ')';
            });
        });
    };
});
