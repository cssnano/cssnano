'use strict';

var postcss = require('postcss');
var list = postcss.list;
var converter = require('./lib/converter');
var reduce = require('reduce-function-call');

var duration = /^((?:[-+]?[\d]+?)(?:\.?(?:[\d]+?))?)(s|ms)/;
var length = /^((?:[-+]?[\d]+?)(?:\.?(?:[\d]+?))?)?(%|em|ex|in|cm|mm|pt|pc|px)?$/;

function durationOptimiser (value) {
    if (duration.test(value)) {
        return value.replace(duration, function (_, num, unit) {
            return converter(num, unit);
        });
    }
    return value;
}

function lengthOptimiser (value, prop) {
    if (length.test(value)) {
        var isZero = false;
        value = value.replace(length, function (_, num, unit) {
            isZero = parseFloat(num) === 0;
            return converter(num, unit);
        });
        if (!~prop.indexOf('flex') && isZero) {
            return '0';
        }
    }
    return value;
}

function eachValue (decl) {
    return function (value) {
        value = durationOptimiser(value);
        value = lengthOptimiser(value, decl.prop);
        return value;
    };
}

module.exports = postcss.plugin('postcss-convert-values', function () {
    return function (css) {
        css.eachDecl(function (decl) {
            var each = eachValue(decl);
            decl.value = list.space(decl.value).map(each).join(' ');
            decl.value = reduce(decl.value, 'calc', function (body, fn) {
                var transform = list.space(body).map(each).join(' ');
                return fn + '(' + transform + ')';
            });
        });
    };
});
