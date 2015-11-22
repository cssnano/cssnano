'use strict';

var nano = require('cssnano');
var prettyBytes = require('pretty-bytes');
var gzip = require('gzip-size').sync;
var Table = require('cli-table');
var round = require('round-precision');

var cssSize = module.exports = function (css) {
    css = css.toString();
    return nano.process(css).then(function (result) {
        var original = gzip(css);
        var minified = gzip(result.css);

        return {
            original: prettyBytes(original),
            minified: prettyBytes(minified),
            difference: prettyBytes(original - minified),
            percent: round((minified / original) * 100, 2) + '%'
        };
    });
};

module.exports.table = function (css) {
    var table = new Table();
    return cssSize(css).then(function (result) {
        table.push.apply(table, Object.keys(result).map(function (key, i) {
            var label = key.slice(0, 1).toUpperCase() + key.slice(1);
            if (i < 2) {
                label += ' (gzip)';
            }
            var row = {};
            row[label] = result[key];
            return row;
        }));
        return table.toString();
    });
};
