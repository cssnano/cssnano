'use strict';

var test = require('tape');
var spawn = require('child_process').spawn;
var path = require('path');
var read = require('fs').readFileSync;

var fixture = 'fixtures/normalizeUrl.fixture.css';

function setup (args, callback) {
    process.chdir(__dirname);

    var ps = spawn(process.execPath, [
        path.resolve(__dirname, '../bin/cmd.js')
    ].concat(args));

    var out = '';
    var err = '';

    ps.stdout.on('data', function (buffer) { out += buffer; });
    ps.stderr.on('data', function (buffer) { err += buffer; });

    ps.on('exit', function (code) {
        callback.call(this, err, out, code);
    });
}

test('cli: standard usage', function (t) {
    t.plan(3);

    setup([fixture], function (err, out, code) {
        var expected = read('fixtures/normalizeUrl.expected.css', 'utf-8');
        t.notOk(err, 'should not error');
        t.equal(code, 0, 'should exit with code 0');
        t.equal(out, expected, 'should minify the css');
    });
});

test('cli: disabling processors', function (t) {
    t.plan(1);

    setup(['fixtures/reduceCalc.fixture.css', '--no-calc'], function (err, out) {
        var expected = read('fixtures/reduceCalc.disabled.css', 'utf-8');
        t.equal(out, expected, 'should disable the calc optimisation');
    });
});

test('cli: usage with sourcemaps', function (t) {
    t.plan(1);

    setup([fixture, '--sourcemap'], function (err, out) {
        var hasMap = /sourceMappingURL=data:application\/json;base64/.test(out);
        t.ok(hasMap, 'should generate a sourcemap');
    });
});
