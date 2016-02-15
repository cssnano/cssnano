#!/usr/bin/env node
'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _readFileStdin = require('read-file-stdin');

var _readFileStdin2 = _interopRequireDefault(_readFileStdin);

var _ = require('./');

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var opts = (0, _minimist2.default)(process.argv.slice(2), {
    alias: {
        h: 'help',
        v: 'version'
    }
});

if (opts.version) {
    console.log(require('../package.json').version);
} else {
    var file = opts._[0];

    if (file === 'help' || opts.help) {
        _fs2.default.createReadStream(__dirname + '/../usage.txt').pipe(process.stdout).on('close', function () {
            return process.exit(1);
        });
    } else {
        (0, _readFileStdin2.default)(file, function (err, buf) {
            if (err) {
                throw err;
            }
            (0, _.table)(buf).then(function (results) {
                return console.log(results);
            });
        });
    }
}