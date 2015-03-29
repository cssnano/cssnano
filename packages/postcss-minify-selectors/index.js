'use strict';

var uniqs = require('uniqs');
var minAttributes = require('./lib/transformAttributes');
var list = require('postcss/lib/list');
var normalize = require('normalize-selector');
var balanced = require('node-balanced');
var natural = require('javascript-natural-sort');

function uniq (params, map) {
    var transform = uniqs(list.comma(params).map(function (selector) {
        // Join selectors that are split over new lines
        return selector.replace(/\\\n/g, '');
    })).sort(natural);
    return map ? transform : transform.join(',');
}

function optimiseSelector (rule) {
    var selector = rule._selector && rule._selector.raw || rule.selector;
    // Ensure that the selector list contains no duplicates
    selector = uniq(selector, true).map(function (sel) {
        // Trim consecutive spaces
        sel = sel.replace(/(?=\S*?)(\s+)(?=\S)/, ' ');
        // Remove the star from *qualified* star selectors
        // TODO: Improve the parsing here - currently it just skips the selector
        // if there is a comment.
        if (!~sel.indexOf('/*') && !~sel.indexOf('*/')) {
            return sel.replace(/(\*)([^\+~=>\s])/g, '$2');
        }
        return sel;
    }).map(minAttributes).join(',');
    // Trim any useless space inside negation pseudo classes
    selector = balanced.replacements({
        source: selector,
        open: ':not(',
        close: ')',
        replace: function (body, head, tail) {
            return head + uniq(body) + tail;
        }
    });
    // Minimise from and 100% in keyframe rules
    if (rule.parent.type !== 'root' && ~rule.parent.name.indexOf('keyframes')) {
        selector = selector.replace('from', '0%').replace('100%', 'to');
    }
    // Trim whitespace around selector combinators
    rule.selector = selector.replace(/\s*([>+~])\s*/g, '$1');
}

function optimiseAtRule (rule) {
    rule.params = normalize(uniq(rule.params));
}

module.exports = function () {
    return function (css) {
        css.eachRule(optimiseSelector);
        css.eachAtRule(optimiseAtRule);
    };
};
