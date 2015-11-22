'use strict';

var test = require('ava');
var spawn = require('child_process').spawn;
var path = require('path');
var size = require('.');
var read = require('fs').readFileSync;

function setup (args, callback) {
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
        callback.call(this, err, out, code);
    });
}

test('cli', function (t) {
    t.plan(5);

    setup(['test.css'], function (err, out) {
        t.notOk(err);
        t.ok(~out.indexOf('43 B'));
        t.ok(~out.indexOf('34 B'));
        t.ok(~out.indexOf('9 B'));
        t.ok(~out.indexOf('79.07%'));
    });
});

test('api', function (t) {
    t.plan(4);

    size(read('test.css', 'utf-8')).then(function (result) {
        t.same(result.original, '43 B');
        t.same(result.minified, '34 B');
        t.same(result.difference, '9 B');
        t.same(result.percent, '79.07%');
    });
});
