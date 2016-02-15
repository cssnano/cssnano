'use strict';

exports.__esModule = true;
exports.table = table;

var _cssnano = require('cssnano');

var _cssnano2 = _interopRequireDefault(_cssnano);

var _prettyBytes = require('pretty-bytes');

var _prettyBytes2 = _interopRequireDefault(_prettyBytes);

var _gzipSize = require('gzip-size');

var _cliTable = require('cli-table');

var _cliTable2 = _interopRequireDefault(_cliTable);

var _roundPrecision = require('round-precision');

var _roundPrecision2 = _interopRequireDefault(_roundPrecision);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var cssSize = function cssSize(css) {
    css = css.toString();
    return _cssnano2.default.process(css).then(function (result) {
        var original = (0, _gzipSize.sync)(css);
        var minified = (0, _gzipSize.sync)(result.css);

        return {
            original: (0, _prettyBytes2.default)(original),
            minified: (0, _prettyBytes2.default)(minified),
            difference: (0, _prettyBytes2.default)(original - minified),
            percent: (0, _roundPrecision2.default)(minified / original * 100, 2) + '%'
        };
    });
};

function table(css) {
    var output = new _cliTable2.default();
    return cssSize(css).then(function (result) {
        console.log(result);
        output.push.apply(output, Object.keys(result).map(function (key, i) {
            var label = key.slice(0, 1).toUpperCase() + key.slice(1);
            if (i < 2) {
                label += ' (gzip)';
            }
            var row = {};
            row[label] = result[key];
            return row;
        }));
        return output.toString();
    });
};

exports.default = cssSize;