'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const minifyFont = require('../src/lib/minify-font.js');

const tests = [
  {
    // .8em "Times New Roman", Arial, Helvetica, sans-serif
    options: { removeQuotes: true },
    fixture: [
      { type: 'word', value: '.8em' },
      { type: "space", value: " " },
      { type: 'string', quote: '"', value: 'Times New Roman' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'Arial' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'Helvetica' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'sans-serif' }
    ],
    expected: [
      { type: 'word', value: '.8em' },
      { type: "space", value: " " },
      { type: 'word', value: 'Times New Roman,Arial,Helvetica,sans-serif' }
    ],
  },
  {
    // .8em"Times New Roman", Arial, Helvetica, sans-serif
    options: { removeQuotes: true },
    fixture: [
      { type: 'word', value: '.8em' },
      { type: 'string', quote: '"', value: 'Times New Roman' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'Arial' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'Helvetica' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'sans-serif' }
    ],
    expected: [
      { type: 'word', value: '.8em' },
      { type: "space", value: " " },
      { type: 'word', value: 'Times New Roman,Arial,Helvetica,sans-serif' }
    ],
  },
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
