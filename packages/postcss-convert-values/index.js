'use strict';

var postcss = require('postcss');
var list = postcss.list;
var converter = require('./lib/converter');
var reduce = require('reduce-function-call');

var duration = /^((?:[-+]?[\d]+?)(?:\.?(?:[\d]+?))?)(s|ms)/;
var length = /^((?:[-+]?[\d]+?)(?:\.?(?:[\d]+?))?)?(%|em|rem|ex|in|cm|mm|pt|pc|px)?$/;
var tidyValue = /^([\d]*)?\.([^1-9]*)?$/;

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
        var match = value.match(length),
            num = match[1],
            integer = parseInt(num),
            unit = match[2];
        if (parseFloat(num) === integer) {
            num = integer;
        }
        if (num !== 0) {
            num = converter(num, unit);
        } else if (~prop.indexOf('flex')) {
            return value;
        }
        return num;
    }
    return value;
}

function eachValue (decl) {
    return function (value) {
        var match = tidyValue.exec(value);
        if (match) {
            if (!/\d/.test(match[2])) {
                value = value.replace(tidyValue, '$1$2');
            } else if (!match[1]) {
                value = value.replace(tidyValue, '0');
            }
        }
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
