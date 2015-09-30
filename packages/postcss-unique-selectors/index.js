'use strict';

var uniqs = require('uniqs');
var sort = require('alphanum-sort');
var postcss = require('postcss');

module.exports = postcss.plugin('postcss-unique-selectors', function () {
    return function (css) {
        css.walkRules(function (rule) {
            rule.selector = sort(uniqs(rule.selectors), {insensitive: true}).join();
        });
    };
});
