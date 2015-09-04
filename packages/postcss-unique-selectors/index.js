'use strict';

var uniqs = require('uniqs');
var natural = require('javascript-natural-sort');
var postcss = require('postcss');

module.exports = postcss.plugin('postcss-unique-selectors', function () {
    return function (css) {
        css.walkRules(function (rule) {
            rule.selector = uniqs(rule.selectors).sort(natural).join();
        });
    };
});
