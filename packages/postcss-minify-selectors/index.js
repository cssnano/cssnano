'use strict';

var uniqs = require('uniqs');
var minAttributes = require('./lib/transformAttributes');
var postcss = require('postcss');
var comma = postcss.list.comma;
var normalize = require('normalize-selector');
var balanced = require('node-balanced');
var natural = require('javascript-natural-sort');
var roq = require('./lib/replaceOutsideQuotes');

function uniq (params, map) {
    var transform = uniqs(comma(params).map(function (selector) {
        // Join selectors that are split over new lines
        return selector.replace(/\\\n/g, '');
    })).sort(natural);
    return map ? transform : transform.join(',');
}

function optimiseSelector (rule) {
    var selector = rule._selector && rule._selector.raw || rule.selector;
    // Ensure that the selector list contains no duplicates
    selector = uniq(selector, true).map(function (sel) {
        return roq(sel, function (range) {
            // Remove the star from *qualified* star selectors
            // TODO: Improve the parsing here - currently it just skips the selector
            // if there is a comment.
            range = range.replace(/(?=\S*?)(\s+)(?=\S)/, ' ');
            if (!~range.indexOf('/*') && !~range.indexOf('*/')) {
                return range.replace(/(\*)([^\+~=>\s])/g, '$2');
            }
            return range;
        });
    }).map(minAttributes).join(',');
    // Minimise from and 100% in keyframe rules
    if (rule.parent.type !== 'root' && ~rule.parent.name.indexOf('keyframes')) {
        selector = comma(selector).map(function (value) {
            if (value === 'from') {
                return '0%';
            }
            if (value === '100%') {
                return 'to';
            }
            return value;
        }).join(',');
    }
    // Trim whitespace around selector combinators
    rule.selector = roq(selector, function (range) {
        // Trim any useless space inside negation pseudo classes
        if (range) {
            range = balanced.replacements({
                source: range,
                open: ':not(',
                close: ')',
                replace: function (body, head, tail) {
                    return head + uniq(body) + tail;
                }
            });
            return range.replace(/\s*([>+~])\s*/g, '$1');
        }
        return range;
    });
}

function optimiseAtRule (rule) {
    rule.params = normalize(uniq(rule.params));
}

module.exports = postcss.plugin('postcss-minify-selectors', function () {
    return function (css) {
        css.eachRule(optimiseSelector);
        css.eachAtRule(optimiseAtRule);
    };
});
