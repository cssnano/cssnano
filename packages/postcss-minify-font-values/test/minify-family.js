'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const minifyFamily = require('../src/lib/minify-family.js');

const tests = [
  {
    // Should strip quotes for names without keywords
    options: {
      removeQuotes: true,
    },
    fixture: [
      { type: 'space', value: ' ' },
      { type: 'word', value: 'Times' },
      { type: 'space', value: ' ' },
      { type: 'word', value: 'new' },
      { type: 'space', value: ' ' },
      { type: 'word', value: 'Roman' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'sans-serif' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'string', quote: '"', value: 'serif' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'string', quote: '"', value: 'Roboto Plus' },
      { type: 'div', value: ',', before: ' ', after: ' ' },
      { type: 'word', value: 'Georgia' },
      { type: 'space', value: ' ' },
    ],
    expected: [
      {
        type: 'word',
        value: 'Times new Roman,sans-serif,"serif",Roboto Plus,Georgia',
      },
    ],
  },
  {
    // Should remove fonts after keywords
    options: {
      removeAfterKeyword: true,
    },
    fixture: [
      { type: 'space', value: ' ' },
      { type: 'word', value: 'Times' },
      { type: 'space', value: ' ' },
      { type: 'word', value: 'new' },
      { type: 'space', value: ' ' },
      { type: 'word', value: 'Roman' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'string', quote: '"', value: 'serif' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'sans-serif' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'string', quote: '"', value: 'Roboto Plus' },
      { type: 'div', value: ',', before: ' ', after: ' ' },
      { type: 'word', value: 'Georgia' },
      { type: 'space', value: ' ' },
    ],
    expected: [
      {
        type: 'word',
        value: 'Times new Roman,"serif",sans-serif',
      },
    ],
  },
  {
    // Should dublicates
    options: {
      removeQuotes: true,
      removeDuplicates: true,
    },
    fixture: [
      { type: 'space', value: ' ' },
      { type: 'word', value: 'Roman' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'string', quote: '"', value: 'serif' },
      { type: 'word', value: 'Roman' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'word', value: 'serif' },
      { type: 'div', value: ',', before: '', after: ' ' },
      { type: 'string', quote: '"', value: 'Roman' },
      { type: 'div', value: ',', before: ' ', after: ' ' },
      { type: 'word', value: 'Georgia' },
      { type: 'space', value: ' ' },
    ],
    expected: [
      {
        type: 'word',
        value: 'Roman,"serif",serif,Georgia',
      },
    ],
  },
];

test('minify-family', () => {
  tests.forEach(({ fixture, options, expected }) => {
    assert.equal(minifyFamily(fixture, options), expected);
  });
});
test.run();
