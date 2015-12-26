'use strict';

var test = require('ava');
var spawn = require('child_process').spawn;
var path = require('path');
var size = require('./');
var read = require('fs').readFileSync;

function setup (args) {
    return new Promise(function (resolve, reject) {
        process.chdir(__dirname);

        var ps = spawn(process.execPath, [
            path.resolve(__dirname, './cli.js')
        ].concat(args));

        var out = '';
        var err = '';

        ps.stdout.on('data', function (buffer) {
            out += buffer;
        });
        ps.stderr.on('data', function (buffer) {
            err += buffer;
        });

        ps.on('exit', function (code) {
            if (err) {
                reject(err);
            }
            resolve([out, code]);
        });
    });
}

test('cli', function (t) {
    return setup(['test.css']).then(function (results) {
        var out = results[0];
        t.ok(~out.indexOf('43 B'));
        t.ok(~out.indexOf('34 B'));
        t.ok(~out.indexOf('9 B'));
        t.ok(~out.indexOf('79.07%'));
    });
});

test('api', function (t) {
    return size(read('test.css', 'utf-8')).then(function (result) {
        t.same(result.original, '43 B');
        t.same(result.minified, '34 B');
        t.same(result.difference, '9 B');
        t.same(result.percent, '79.07%');
    });
});
