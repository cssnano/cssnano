import {readFileSync as read} from 'fs';
import {spawn} from 'child_process';
import path from 'path';
import test from 'ava';
import stripAnsi from 'strip-ansi';
import size, {table} from '..';

function setup (args) {
    return new Promise((resolve, reject) => {
        process.chdir(__dirname);

        let ps = spawn(process.execPath, [
            path.resolve(__dirname, '../../dist/cli.js'),
        ].concat(args));

        let out = '';
        let err = '';

        ps.stdout.on('data', buffer => (out += buffer));
        ps.stderr.on('data', buffer => (err += buffer));

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
        const out = results[0];
        t.truthy(~out.indexOf('43 B'));
        t.truthy(~out.indexOf('34 B'));
        t.truthy(~out.indexOf('9 B'));
        t.truthy(~out.indexOf('79.07%'));
    });
});

test('api', t => {
    return size(read(__dirname + '/test.css', 'utf-8')).then(result => {
        t.deepEqual(result.original, '43 B');
        t.deepEqual(result.minified, '34 B');
        t.deepEqual(result.difference, '9 B');
        t.deepEqual(result.percent, '79.07%');
    });
});

const tableOutput = `
┌─────────────────┬────────┐
│ Original (gzip) │ 43 B   │
├─────────────────┼────────┤
│ Minified (gzip) │ 34 B   │
├─────────────────┼────────┤
│ Difference      │ 9 B    │
├─────────────────┼────────┤
│ Percent         │ 79.07% │
└─────────────────┴────────┘
`.replace(/^\s+|\s+$/g, '');

test('table', t => {
    return table(read(__dirname + '/test.css', 'utf-8')).then(result => {
        t.is(stripAnsi(result), tableOutput);
    });
});

test('api options', t => {
    return size(
        '@namespace islands url("http://bar.yandex.ru/ui/islands");', {
            discardUnused: false,
        }
    ).then(result => {
        t.deepEqual(result.minified, '67 B');
    });
});
