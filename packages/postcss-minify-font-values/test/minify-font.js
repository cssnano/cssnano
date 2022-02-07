'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const minifyFont = require('../src/lib/minify-font.js');

const tests = [
  {
    options: {},
    fixture: [
      { type: 'word', value: 'bold' },
      { type: 'space', value: '  ' },
      { type: 'word', value: 'italic' },
      { type: 'space', value: ' \t ' },
      { type: 'word', value: '20px' },
      { type: 'space', value: ' \n ' },
      { type: 'word', value: 'Times' },
      { type: 'space', value: ' ' },
      { type: 'word', value: 'New' },
      { type: 'space', value: ' \t ' },
      { type: 'word', value: 'Roman' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'serif' },
    ],
    expected: [
      { type: 'word', value: '700' },
      { type: 'space', value: '  ' },
      { type: 'word', value: 'italic' },
      { type: 'space', value: ' \t ' },
      { type: 'word', value: '20px' },
      { type: 'space', value: ' \n ' },
      { type: 'word', value: 'Times New Roman,serif' },
    ],
  },
];

test('minify-font', () => {
  tests.forEach(({ fixture, options, expected }) => {
    assert.equal(minifyFont(fixture, options), expected);
  });
});
test.run();
