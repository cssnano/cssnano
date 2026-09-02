import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import minifyFont from '../src/lib/minify-font.js';

describe('.8Em', () => {
  test('.8em "Times New Roman", Arial, Helvetica, sans-serif', () => {
    assert.equal(
      minifyFont('.8em "Times New Roman", Arial, Helvetica, sans-serif', {
        removeQuotes: true,
      }),
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
});

describe('Ultra-Condensed', () => {
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
});

test('tabs and newlines', () => {
  assert.equal(
    minifyFont('bold italic \t 20px \n Times New\tRoman, serif', {}),
    '700 italic \t 20px \n Times New Roman,serif'
  );
});

test('preserves a functional font size and line height', () => {
  assert.equal(
    minifyFont(
      'italic calc(1em + 2px) / clamp(1, max(1, 2), 2) "A, B", serif',
      { removeQuotes: true }
    ),
    'italic calc(1em + 2px) / clamp(1, max(1, 2), 2) A\\, B,serif'
  );
});

test('passes through environment functions in the font shorthand', () => {
  assert.equal(
    minifyFont('env(--font-size) / env(--line-height) "A\\, B", serif', {
      removeQuotes: true,
    }),
    'env(--font-size) / env(--line-height) "A\\, B", serif'
  );
});

test('passes through variable functions before the size', () => {
  assert.equal(
    minifyFont('italic var(--style) bold 16px "Helvetica Neue", serif', {
      removeQuotes: true,
    }),
    'italic var(--style) bold 16px "Helvetica Neue", serif'
  );
});

test('passes through variable functions as the size and line height', () => {
  for (const value of [
    'italic var(--size) "Helvetica Neue", serif',
    'italic 16px/var(--line-height) "Helvetica Neue", serif',
  ])
    assert.equal(minifyFont(value, { removeQuotes: true }), value);
});

test('keeps numeric weights before a dimensional font size', () => {
  assert.equal(
    minifyFont('condensed oblique 25deg 753 12pt "Helvetica Neue", serif', {
      removeQuotes: true,
    }),
    'condensed oblique 25deg 753 12pt Helvetica Neue,serif'
  );
});

test('recognizes unitless zero as a font size', () => {
  assert.equal(
    minifyFont('italic 0 "Helvetica Neue", serif', { removeQuotes: true }),
    'italic 0 Helvetica Neue,serif'
  );
});

test('passes through variables in a commented line-height boundary', () => {
  assert.equal(
    minifyFont(
      'italic 16px /* size */ / /* line-height */ var(--lh) "Helvetica Neue",sans-serif',
      { removeQuotes: true }
    ),
    'italic 16px /* size */ / /* line-height */ var(--lh) "Helvetica Neue",sans-serif'
  );
});

test('preserves escaped generic-family names', () => {
  assert.equal(
    minifyFont('16px "u\\69 -serif", "ui\\2d serif"', {
      removeQuotes: true,
    }),
    '16px "u\\69 -serif","ui\\2d serif"'
  );
});

test('passes through an unbalanced functional value', () => {
  const value = 'calc(1em + 2px "A", serif';
  assert.equal(minifyFont(value, { removeQuotes: true }), value);
});
