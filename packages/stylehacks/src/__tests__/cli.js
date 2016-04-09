import ava from 'ava';
import {spawn} from 'child_process';
import path from 'path';
import {readFileSync as read} from 'fs';

let fixture = 'fixture.css';

function setup (args) {
    return new Promise((resolve, reject) => {
        process.chdir(__dirname);

        let ps = spawn(process.execPath, [
            path.resolve(__dirname, '../../dist/cli.js')
        ].concat(args));
        
        let out = '';
        let err = '';

        ps.stdout.on('data', buffer => out += buffer);
        ps.stderr.on('data', buffer => err += buffer);

        ps.on('exit', code => {
            if (err) {
                reject(err);
            }
            resolve([out, code]);
        });
    });
}

ava('cli: custom browsers', t => {
    return setup([fixture, '--browsers', 'ie 6'], (out, code) => {
        t.falsy(code, 'should exit with code 0');
        t.deepEqual(out, read('fixture.css', 'utf-8'), 'should not transform the css');
    });
});

ava('cli: defaults', t => {
    return setup([fixture], (out, code) => {
        t.falsy(code, 'should exit with code 0');
        t.deepEqual(out, read('expected.css', 'utf-8'), 'should transform the css');
    });
});

ava('cli: lint', t => {
    return setup([fixture, '--lint'], out => {
        let msg = 'line 2  col 5  Bad property  _color';
        t.truthy(~out.indexOf(msg), 'should display a warning');
    });
});

ava('cli: lint (custom browsers)', t => {
    return setup([fixture, '--lint', '--browsers', 'ie 6'], (out, code) => {
        let msg = 'No hacks found.';
        t.truthy(~out.indexOf(msg), 'should display a success message');
        t.falsy(code, 'should exit with code 0');
    });
});

ava('cli: silent', t => {
    return setup([fixture, '--silent', '--lint'], (out, code) => {
        t.truthy(code, 'should exit with a non-zero code');
    });
});

ava('cli: sourcemaps', t => {
    return setup([fixture, '--sourcemap'], out => {
        const hasMap = /sourceMappingURL=data:application\/json;base64/.test(out);
        t.truthy(hasMap, 'should generate a sourcemap');
    });
});
