import { readFileSync as read } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import * as assert from 'uvu/assert';
import { test } from 'uvu';
import colors from 'colors/safe';
import size, { table, numeric } from '../';

let noopProcessorPath = path.resolve(__dirname, '../../processors/noop.js');

function setup(args) {
  return new Promise((resolve, reject) => {
    process.chdir(__dirname);

    let ps = spawn(
      process.execPath,
      [path.resolve(__dirname, '../../dist/cli.js')].concat(args)
    );

    let out = '';
    let err = '';

    ps.stdout.on('data', (buffer) => (out += buffer.toString()));
    ps.stderr.on('data', (buffer) => (err += buffer.toString()));

    ps.on('exit', (code) => {
      if (code !== 0) {
        return reject(err);
      }

      resolve([out, code]);
    });
  });
}

test('cli', () => {
  return setup(['test.css']).then((results) => {
    let out = results[0];
    assert.is(!!~out.indexOf('43 B'), true);
    assert.is(!!~out.indexOf('34 B'), true);
    assert.is(!!~out.indexOf('9 B'), true);
    assert.is(!!~out.indexOf('79.07%'), true);
  });
});

test('cli with processor argument', () => {
  return setup(['-p', noopProcessorPath, 'test.css']).then((results) => {
    let out = results[0];
    assert.is(!!~out.indexOf('100%'), true);
  });
});

test('api', () => {
  const input = path.join(__dirname, 'test.css');
  return size(read(input, 'utf-8'), { from: input }).then((result) => {
    assert.equal(result, {
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

test('table', () => {
  const input = path.join(__dirname, 'test.css');
  return table(read(input, 'utf-8'), { from: input }).then((result) => {
    assert.is(
      colors.stripColors(result),
      `
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
└────────────┴──────────────┴────────┴────────┘`.trim()
    );
  });
});

test('numeric', () => {
  const input = path.join(__dirname, 'test.css');
  return numeric(read(input, 'utf-8'), { from: input }).then((result) => {
    assert.equal(result, {
      uncompressed: {
        original: 23,
        processed: 14,
        difference: 9,
        percent: 0.6087,
      },
      gzip: {
        original: 43,
        processed: 34,
        difference: 9,
        percent: 0.7907,
      },
      brotli: {
        original: 27,
        processed: 16,
        difference: 11,
        percent: 0.5926,
      },
    });
  });
});

test('api options', () => {
  return size('@namespace islands url("http://bar.yandex.ru/ui/islands");', {
    discardUnused: false,
    from: undefined,
  }).then((result) => {
    assert.is(result.gzip.processed, '67 B');
  });
});
test.run();
