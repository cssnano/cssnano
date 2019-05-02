import test from 'ava';
import minifyFamily from '../lib/minify-family';

const tests = [
  {
    message: 'Should strip quotes for names without keywords',
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
    message: 'Should remove fonts after keywords',
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
    message: 'Should dublicates',
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

test('minify-family', (t) => {
  t.plan(tests.length);
  tests.forEach(({ fixture, options, expected, message }) => {
    t.deepEqual(minifyFamily(fixture, options), expected, message);
  });
});
