import { test } from 'node:test';
import assert from 'node:assert/strict';
import minifyFamily from '../src/lib/minify-family.js';
import cssWideKeywords from '../src/data/cssWideKeywords.json' with { type: 'json' };

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
  for (const { fixture, options, expected } of tests) {
    const value = fixture
      .map((node, index) => {
        const previous = fixture[index - 1];
        const separator =
          node.type === 'word' &&
          (previous?.type === 'string' || previous?.type === 'function')
            ? ','
            : '';
        if (node.type === 'string')
          return `${node.quote}${node.value}${node.quote}`;
        return separator + node.value;
      })
      .join('');
    assert.equal(minifyFamily(value, options), expected[0].value);
  }
});

test('passes through unbalanced blocks', () => {
  const value = 'foo,bar(calc(1, 2)';
  assert.equal(minifyFamily(value, { removeQuotes: true }), value);
});

test('keeps reserved family names quoted', () => {
  const value =
    '"inherit","initial","unset","revert","revert-layer","inherit family","sans-serif","serif","fantasy","cursive","monospace","system-ui","math","ui-serif","ui-sans-serif","ui-monospace","ui-rounded","emoji","fangsong","Fancy serif","caption","icon","menu","message-box","small-caption","status-bar","caption family"';
  assert.equal(minifyFamily(value, { removeQuotes: true }), value);
});

test('keeps a family named revert-rule quoted because unquoted it is the CSS-wide keyword of css-cascade-6', () => {
  assert.equal(
    minifyFamily('"revert-rule"', { removeQuotes: true }),
    '"revert-rule"'
  );
});

test('keeps every CSS-wide keyword webref lists quoted, since unquoted it is not a family name', () => {
  const value = cssWideKeywords.keywords
    .map((keyword) => `"${keyword}"`)
    .join(',');
  assert.equal(minifyFamily(value, { removeQuotes: true }), value);
});

test('keeps default and none quoted, which font-family reserves though they are not CSS-wide', () => {
  assert.equal(
    minifyFamily('"default","none"', { removeQuotes: true }),
    '"default","none"'
  );
});

test('keeps quoted script generic syntax and later fallbacks', () => {
  assert.equal(
    minifyFamily('"generic(fangsong)",serif', {
      removeAfterKeyword: true,
      removeQuotes: true,
    }),
    '"generic(fangsong)",serif'
  );
});

test('retains fallbacks after incomplete and script-specific generics', () => {
  for (const value of ['generic(foo),serif', 'fangsong,serif'])
    assert.equal(minifyFamily(value, { removeAfterKeyword: true }), value);
});
