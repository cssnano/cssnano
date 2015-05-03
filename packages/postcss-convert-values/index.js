'use strict';

var postcss = require('postcss');
var convert = require('./lib/convert');
var eachValue = require('./lib/eachValue');
var parseUnit = require('./lib/parseUnit');

module.exports = postcss.plugin('postcss-convert-values', function () {
    return function (css) {
        css.eachDecl(function (decl) {
            decl.value = eachValue(decl.value, function (value) {
                var number, unit;

                if (!~decl.prop.indexOf('flex') && !isNaN(number = parseFloat(value))) {
                    unit = parseUnit(value);

                    if (number === 0) {
                        value = (unit === 'ms' || unit === 's') ? 0 + unit : 0;
                    } else {
                        value = convert(number, unit);
                    }

                    return value;
                }
            });
        });
    };
});
