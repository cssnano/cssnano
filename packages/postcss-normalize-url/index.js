'use strict';

var postcss = require('postcss');
var valueParser = require('postcss-value-parser');
var normalize = require('normalize-url');
var isAbsolute = require('is-absolute-url');
var path = require('path');
var assign = require('object-assign');

var multiline = /\\[\r\n]/;
var escapeChars = /([\s\(\)"'])/g;

function convert (url, options) {
    if (isAbsolute(url) || !url.indexOf('//')) {
        return normalize(url, options);
    }
    return path.normalize(url).replace(new RegExp('\\' + path.sep, 'g'), '/');
}

function transformNamespace (rule, opts) {
    rule.params = valueParser(rule.params).walk(function (node) {
        if (node.type === 'function' && node.value === 'url' && node.nodes.length) {
            node.type = 'string';
            node.quote = node.nodes[0].quote || '"';
            node.value = node.nodes[0].value;
        }

        if (node.type === 'string') {
            node.value = convert(node.value.trim(), opts);
        }

        return false;
    }).toString();
}

function transformDecl (decl, opts) {
    decl.value = valueParser(decl.value).walk(function (node) {
        if (node.type !== 'function' || node.value !== 'url' || !node.nodes.length) {
            return;
        }

        var url = node.nodes[0];
        var escaped;

        node.before = node.after = '';
        url.value = url.value.trim().replace(multiline, '');

        if (~url.value.indexOf('data:image/') || ~url.value.indexOf('data:application/')) {
            return false;
        }

        if (!~url.value.indexOf('chrome-extension')) {
            url.value = convert(url.value, opts);
        }

        if (escapeChars.test(url.value)) {
            escaped = url.value.replace(escapeChars, '\\$1');
            if (escaped.length < url.value.length + (url.type === 'string' ? 2 : 0)) {
                url.value = escaped;
                url.type = 'word';
            }
        } else {
            url.type = 'word';
        }

        return false;
    }).toString();
}

module.exports = postcss.plugin('postcss-normalize-url', function (opts) {
    opts = assign({
        normalizeProtocol: false,
        stripFragment: false,
        stripWWW: true
    }, opts);

    return function (css) {
        css.walk(function (node) {
            if (node.type === 'decl') {
                return transformDecl(node, opts);
            } else if (node.type === 'atrule' && node.name === 'namespace') {
                return transformNamespace(node, opts);
            }
        });
    };
});
