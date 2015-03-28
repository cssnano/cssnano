'use strict';

var normalize = require('normalize-selector');
var unquote = require('./unquote');

var attributeValue = /\[.*?=(.*)\]/;
var escapes = /\\([0-9A-Fa-f]{1,6})[ \t\n\f\r]?/g;
var range = /[\u0000-\u002c\u002e\u002f\u003A-\u0040\u005B-\u005E\u0060\u007B-\u009f]/;

function isAttributeSelector (selector) {
    return /\[.*?\]/.test(selector);
}

function hasValue (selector) {
    return attributeValue.test(selector);
}

function getValue (selector) {
    if (hasValue(selector)) {
        return selector.replace(attributeValue, '$1');
    }
}

/**
 * Can unquote attribute detection from mothereff.in
 * Copyright Mathias Bynens <https://mathiasbynens.be/>
 * https://github.com/mathiasbynens/mothereff.in
 */
function canUnquote (value) {
    value = unquote(value);
    if (value) {
        value = value.replace(escapes, 'a').replace(/\\./g, 'a');
        return !(range.test(value) || /^(?:-?\d|--)/.test(value));
    }
    return false;
}

module.exports = function transformAttributes (selector) {
    if (isAttributeSelector(selector)) {
        selector = normalize(selector);
        var value = getValue(selector);
        if (value && canUnquote(value)) {
            return unquote(selector);
        }
    }
    return selector;
};
