import nodetest from 'node:test';
import assert from 'node:assert/strict';
import { parseListOfComponentValues } from '@csstools/css-parser-algorithms';
import { tokenize } from '@csstools/css-tokenizer';
import getArguments from '../src/getArguments.js';

const { test } = nodetest;
const parse = (value) => parseListOfComponentValues(tokenize({ css: value }));
const serialize = (values) => values.map((value) => value.toString()).join('');

test('splits top-level commas and preserves local whitespace', () => {
  assert.deepStrictEqual(
    getArguments(parse('  one , two  ,three ')).map(serialize),
    ['  one ', ' two  ', 'three ']
  );
});

test('preserves empty, leading, trailing, and adjacent arguments', () => {
  assert.deepStrictEqual(getArguments(parse(',one,, two,')).map(serialize), [
    '',
    'one',
    '',
    ' two',
    '',
  ]);
});

test('does not split nested commas or slashes', () => {
  assert.deepStrictEqual(
    getArguments(parse('fn(a,b), [c,d], e/f')).map(serialize),
    ['fn(a,b)', ' [c,d]', ' e/f']
  );
});

test('keeps comments, strings, URLs, escapes, and malformed containers opaque', () => {
  assert.deepStrictEqual(
    getArguments(parse('/**/ "a,b", url(a,b), \\66 oo, broken(a,b')).map(
      serialize
    ),
    ['/**/ "a,b"', ' url(a,b)', ' \\66 oo', ' broken(a,b']
  );
});

test('accepts a FunctionNode directly', () => {
  assert.deepStrictEqual(
    getArguments(parse('linear-gradient(red, blue)')[0]).map(serialize),
    ['red', ' blue']
  );
});
