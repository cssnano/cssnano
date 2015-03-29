'use strict';

var colormin = require('colormin');
var list = require('postcss/lib/list');

module.exports = function () {
    return function (css) {
        css.eachDecl(/^(?!font)/, function (decl) {
            decl.value = list.space(decl.value).map(colormin).join(' ');
        });
    };
};
