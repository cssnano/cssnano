'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const minifyFont = require('../src/lib/minify-font.js');

test('.8em "Times New Roman", Arial, Helvetica, sans-serif', () => {
  assert.equal(
    minifyFont(
      '.8em "Times New Roman", Arial, Helvetica, sans-serif',

      { removeQuotes: true }
    ),
    '.8em Times New Roman,Arial,Helvetica,sans-serif'
  );
});

test('.8em"Times New Roman", Arial, Helvetica, sans-serif', () => {
  assert.equal(
    minifyFont('.8em"Times New Roman", Arial, Helvetica, sans-serif', {
      removeQuotes: true,
    }),
    '.8em Times New Roman,Arial,Helvetica,sans-serif'
  );
});

test('ultra-condensed small-caps 1.2em "Fira Sans", sans-serif;', () => {
  assert.equal(
    minifyFont('ultra-condensed small-caps 1.2em "Fira Sans", sans-serif;', {
      removeQuotes: true,
    }),
    'ultra-condensed small-caps 1.2em Fira Sans,sans-serif;'
  );
});

test('ultra-condensed small-caps 1.2em"Fira Sans", sans-serif;', () => {
  assert.equal(
    minifyFont('ultra-condensed small-caps 1.2em"Fira Sans", sans-serif;', {
      removeQuotes: true,
    }),
    'ultra-condensed small-caps 1.2em Fira Sans,sans-serif;'
  );
});

test('tabs and newlines', () => {
  assert.equal(
    minifyFont('bold italic \t 20px \n Times New\tRoman, serif', {}),
    '700 italic \t 20px \n Times New Roman,serif'
  );
});
