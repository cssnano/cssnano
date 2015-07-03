var test = require('tape');
var directory = require('fs').readdirSync;
var path = require('path');
var spawn = require('child_process').spawn;
var base = path.join(__dirname, '../tests/integrations');

function setup (args, callback) {
    process.chdir(__dirname);

    var timer = process.hrtime();
    var ps = spawn(process.execPath, [
        path.resolve(__dirname, '../bin/cmd.js')
    ].concat(args));

    var out = '';
    var err = '';

    ps.stdout.on('data', function (buffer) { out += buffer; });
    ps.stderr.on('data', function (buffer) { err += buffer; });

    ps.on('exit', function (code) {
        var completed = process.hrtime(timer);
        var time = Math.round((1000 * completed[0] + completed[1] / 1000000) * 100) / 100;
        callback.call(this, err, time, code);
    });
}


var specs = directory(base).filter(function (fname) {
    return ~fname.indexOf('fixture');
}).map(function (fname) {
    return {
        path: '../tests/integrations/' + fname,
        name: path.basename(fname).split('.')[0]
    };
});

specs.forEach(function (spec) {
    test('benchmark: ' + spec.name, function (t) {
        t.plan(1);
        setup([spec.path], function (err, time, code) {
            t.ok(time, 'minified in ' + time + 'ms');
        });
    });
});
