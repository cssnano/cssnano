'use strict';

var list = require('postcss').list;
var balancedMatch = require('balanced-match');
var trim = require('./util/trim');
var eachCssFunction = require('./util/eachCssFunction');

var functions = [
    'calc',
    'cubic-bezier',
    'gradient',
    'hsl',
    'rect',
    'rgb',
    'rotate3d',
    'scale',
    'scale3d',
    'transform3d',
    'translate3d',
    'url',
    'var'
];

function functionOptimiser (type) {
    return function (declaration) {
        eachCssFunction(declaration, type, function (substring) {
            var match = balancedMatch('(', ')', substring);
            return [
                match.pre.toLowerCase(),
                '(',
                list.comma(match.body).map(function (value) {
                    return list.space(value).join(' ');
                }).join(','),
                ')',
                trim(match.post)
            ].join('');
        });
    };
}

module.exports = function () {
    return function (css) {
        functions.forEach(function (fn) {
            // font face properties need the space between url & format
            css.eachDecl(/^((?!(src)).)*$/, functionOptimiser(fn));
        });
    };
};
