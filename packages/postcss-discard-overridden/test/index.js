'use strict';
const fs = require('fs');
const assert = require('uvu/assert');
const { test } = require('uvu');
const postcss = require('postcss');
const { diffLines } = require('diff');
const pc = require('picocolors');
const plugin = require('../src/index.js');

function getDiff(left, right) {
  let msg = ['\n'];

  diffLines(left, right).forEach((item) => {
    if (item.added || item.removed) {
      let text = item.value
        .replace('\n', '\u00b6\n')
        .replace('\ufeff', '[[BOM]]');

      msg.push(pc[item.added ? 'green' : 'red'](text));
    } else {
      let value = item.value.replace('\ufeff', '[[BOM]]');
      let lines = value.split('\n');

      // max line count for each item
      let keepLines = 6;
      // lines to be omitted
      let omitLines = lines.length - keepLines;

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
  let output = read(`${input}.post`);

  return () =>
    postcss([plugin()])
      .process(read(input), { from: undefined })
      .then((result) => {
        if (result.css !== output) {
          throw getDiff(result.css, output);
        }

        assert.is(result.warnings().length, 0);
      });
}

test('overridden @keyframes should be discarded correctly', exec('keyframes'));

test(
  'overridden @counter-style should be discarded correctly',
  exec('counter-style')
);
test.run();
