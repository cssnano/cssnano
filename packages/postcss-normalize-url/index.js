'use strict';

var eachFunction = require('./lib/eachFunction');
var shorter = require('./lib/shorter');
var normalize = require('normalize-url');
var isAbsolute = require('is-absolute-url');
var path = require('path');

var multiline = /\\[\r\n]/;
var extractUrl = /^url\(([\s\S]*)\)(.*)?$/;
var unquote = /^("|')(.*)\1$/;
var escapeChars = /[\s\(\)'"]/;
var replaceEscapeChars = /([\s\(\)"'])/g;

module.exports = function plugin (options) {
    options = { normalizeProtocol: false, stripFragment: false } || {};

    var convert = function (url) {
        if (isAbsolute(url)) {
            return normalize(url, options);
        }
        return path.normalize(url);
    };

    return function (css) {
        css.eachDecl(function (declaration) {
            declaration.value = declaration.value.replace(multiline, '');
            eachFunction(declaration, 'url', function (substring) {
                var url = substring.replace(extractUrl, '$1').trim();
                url = url.replace(unquote, function (m, quote, body) {
                    return quote + convert(body.trim()) + quote;
                });
                var trimmed = url.replace(unquote, '$2').trim();
                var optimised = convert(trimmed);
                if (escapeChars.test(trimmed)) {
                    var isEscaped = trimmed.replace(replaceEscapeChars, '\\$1');
                    optimised = shorter(isEscaped, url);
                }
                return substring.replace(extractUrl, function (m, pre, post) {
                    if (post) {
                        return 'url(' + optimised + ')' + post;
                    }
                    return 'url(' + optimised + ')';
                });
            });
        });
    }
}
