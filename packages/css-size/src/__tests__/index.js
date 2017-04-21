import {readFileSync as read} from 'fs';
import {spawn} from 'child_process';
import path from 'path';
import test from 'ava';
import stripAnsi from 'strip-ansi';
import size, {table} from '..';

let noopProcessorPath = path.resolve(__dirname, '../../processors/noop.js');

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

test('cli with processor argument', t => {
    return setup(['-p', noopProcessorPath, 'test.css']).then(results => {
        let out = results[0];
        t.truthy(~out.indexOf('100%'));
    });
});

test('api', t => {
    return size(read('test.css', 'utf-8')).then(result => {
        t.deepEqual(result, {
            uncompressed: {
                original: '23 B',
                processed: '14 B',
                difference: '9 B',
                percent: '60.87%',
            },
            gzip: {
                original: '43 B',
                processed: '34 B',
                difference: '9 B',
                percent: '79.07%',
            },
            brotli: {
                original: '27 B',
                processed: '16 B',
                difference: '11 B',
                percent: '59.26%',
            },
        });
    });
});

test('api options', t => {
    return size(
        '@namespace islands url("http://bar.yandex.ru/ui/islands");', {
            discardUnused: false,
        }
    ).then(result => {
        t.deepEqual(result.gzip.processed, "67 B");
    });
});

test('cli', t => {
    return setup(['test.css']).then(results => {
        const out = results[0];
        t.truthy(~out.indexOf('43 B'));
        t.truthy(~out.indexOf('34 B'));
        t.truthy(~out.indexOf('9 B'));
        t.truthy(~out.indexOf('79.07%'));
    });
});

const tableOutput = `
┌────────────┬──────────────┬────────┬────────┐
│            │ Uncompressed │ Gzip   │ Brotli │
├────────────┼──────────────┼────────┼────────┤
│ Original   │ 23 B         │ 43 B   │ 27 B   │
├────────────┼──────────────┼────────┼────────┤
│ Processed  │ 14 B         │ 34 B   │ 16 B   │
├────────────┼──────────────┼────────┼────────┤
│ Difference │ 9 B          │ 9 B    │ 11 B   │
├────────────┼──────────────┼────────┼────────┤
│ Percent    │ 60.87%       │ 79.07% │ 59.26% │
└────────────┴──────────────┴────────┴────────┘
`.replace(/^\s+|\s+$/g, '');

test('table', t => {
    return table(read(__dirname + '/test.css', 'utf-8')).then(result => {
        t.is(stripAnsi(result), tableOutput);
    });
});
