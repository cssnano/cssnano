'use strict';

import tape from 'tape';
import child from 'child_process';
import path from 'path';
import fs from 'fs';

let read = fs.readFileSync;
let fixture = 'fixture.css';

function setup (args, callback) {
    process.chdir(__dirname);

    let ps = child.spawn(process.execPath, [
        path.resolve(__dirname, '../../bin/cmd.js')
    ].concat(args));

    let out = '';
    let err = '';

    ps.stdout.on('data', buffer => { out += buffer; });
    ps.stderr.on('data', buffer => { err += buffer; });

    ps.on('exit', code => {
        callback.call(this, err, out, code);
    });
}

tape('cli: custom browsers', t => {
    t.plan(2);

    setup([fixture, '--browsers', 'ie 6'], (err, out, code) => {
        t.notOk(code, 'should exit with code 0');
        t.equal(out, read('fixture.css', 'utf-8'), 'should not transform the css');
    });
});

tape('cli: defaults', t => {
    t.plan(3);

    setup([fixture], (err, out, code) => {
        t.notOk(err, 'should not error');
        t.notOk(code, 'should exit with code 0');
        t.equal(out, read('expected.css', 'utf-8'), 'should transform the css');
    });
});

tape('cli: lint', t => {
    t.plan(1);

    setup([fixture, '--lint'], (err, out) => {
        let msg = 'line 2  col 5  Bad property  _color';
        t.ok(~out.indexOf(msg), 'should display a warning');
    });
});

tape('cli: lint (custom browsers)', t => {
    t.plan(2);

    setup([fixture, '--lint', '--browsers', 'ie 6'], (err, out, code) => {
        t.notOk(code, 'should exit with code 0');
        let msg = 'No hacks found.';
        t.ok(~out.indexOf(msg), 'should display a success message');
    });
});

tape('cli: silent', t => {
    t.plan(1);

    setup([fixture, '--silent', '--lint'], (err, out, code) => {
        t.ok(code, 'should exit with a non-zero code');
    });
});

tape('cli: sourcemaps', t => {
    t.plan(1);

    setup([fixture, '--sourcemap'], (err, out) => {
        var hasMap = /sourceMappingURL=data:application\/json;base64/.test(out);
        t.ok(hasMap, 'should generate a sourcemap');
    });
});
