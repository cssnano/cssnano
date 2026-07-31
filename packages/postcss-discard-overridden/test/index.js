'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const postcss = require('postcss');
const { diffLines } = require('diff');
const pc = require('picocolors');
const plugin = require('../src/index.js');

function getDiff(left, right) {
  const msg = ['\n'];

  diffLines(left, right).forEach((item) => {
    if (item.added || item.removed) {
      const text = item.value
        .replace('\n', '\u00b6\n')
        .replace('\ufeff', '[[BOM]]');

      msg.push(pc[item.added ? 'green' : 'red'](text));
    } else {
      const value = item.value.replace('\ufeff', '[[BOM]]');
      const lines = value.split('\n');

      // max line count for each item
      const keepLines = 6;
      // lines to be omitted
      const omitLines = lines.length - keepLines;

      if (lines.length > keepLines) {
        lines.splice(
          Math.floor(keepLines / 2),
          omitLines,
          pc.gray('(...' + omitLines + ' lines omitted...)')
        );
      }

      msg.concat(lines);
    }
  });

  msg.push('\n');

  return msg.map((line) => '  ' + line).join('');
}

function read(file) {
  return fs.readFileSync(__dirname + `/fixtures/${file}.css`, {
    encoding: 'utf-8',
  });
}

function exec(input) {
  const output = read(`${input}.post`);

  return () =>
    postcss([plugin()])
      .process(read(input), { from: undefined })
      .then((result) => {
        if (result.css !== output) {
          throw getDiff(result.css, output);
        }

        assert.strictEqual(result.warnings().length, 0);
      });
}

test('overridden @keyframes should be discarded correctly', exec('keyframes'));

test(
  'overridden @counter-style should be discarded correctly',
  exec('counter-style')
);
