import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenType } from '@csstools/css-tokenizer';
import { ValueTable } from '../../src/values/value.js';

test('ValueTable.intern returns the same Value for equal text', () => {
  const table = new ValueTable();
  assert.equal(table.intern('a b'), table.intern('a b'));
});

test('ValueTable.intern returns different Values for different text', () => {
  const table = new ValueTable();
  assert.notEqual(table.intern('a'), table.intern('b'));
});

test('ValueTable from another run does not share a Value with this one', () => {
  assert.notEqual(new ValueTable().intern('a'), new ValueTable().intern('a'));
});

test('Value.text is the text it was interned from', () => {
  assert.equal(new ValueTable().intern('1px solid').text, '1px solid');
});

test('Value.tokens lists the tokenizer tokens of its text without end-of-file', () => {
  const types = new ValueTable()
    .intern('a b')
    .tokens()
    .map((token) => token[0]);
  assert.deepEqual(types, [
    TokenType.Ident,
    TokenType.Whitespace,
    TokenType.Ident,
  ]);
});

test('Value.tokens returns the same list on every call', () => {
  const value = new ValueTable().intern('a b');
  assert.equal(value.tokens(), value.tokens());
});

test('Value.structure pairs an opening function token with its closing parenthesis', () => {
  const structure = new ValueTable().intern('f(a)').structure();
  assert.equal(structure.endForOpening(0), 2);
});

test('Value.structure reads the tokens the Value already holds', () => {
  const value = new ValueTable().intern('f(a)');
  assert.equal(value.structure().tokens, value.tokens());
});

test('Value.structure is undefined when a bracket is never closed', () => {
  assert.equal(new ValueTable().intern('f(a').structure(), undefined);
});

test('Value.structure is undefined when brackets close in the wrong order', () => {
  assert.equal(new ValueTable().intern('(]').structure(), undefined);
});
