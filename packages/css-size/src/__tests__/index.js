import test from 'ava';
import {spawn} from 'child_process';
import path from 'path';
import size from '../';
import {readFileSync as read} from 'fs';

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

test('cli', t => {
    return setup(['test.css']).then(results => {
        let out = results[0];
        t.truthy(~out.indexOf('43 B'));
        t.truthy(~out.indexOf('34 B'));
        t.truthy(~out.indexOf('9 B'));
        t.truthy(~out.indexOf('79.07%'));
    });
});

test('api', t => {
    return size(read('test.css', 'utf-8')).then(result => {
        t.deepEqual(result.original, '43 B');
        t.deepEqual(result.minified, '34 B');
        t.deepEqual(result.difference, '9 B');
        t.deepEqual(result.percent, '79.07%');
    });
});
