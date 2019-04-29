import test from 'ava';
import minifyFont from '../lib/minify-font';

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

test('minify-font', (t) => {
  tests.forEach(({ fixture, options, expected }) => {
    t.deepEqual(minifyFont(fixture, options), expected);
  });
});
