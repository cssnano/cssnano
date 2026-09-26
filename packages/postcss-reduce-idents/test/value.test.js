import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { rewrite, tokens, TokenType } from '../src/lib/value.js';
import { counter } from '../src/lib/slots.js';

test('rewrite serializes supplied tokenizer edits in source order', () => {
  const parsed = tokens('a b');
  const result = rewrite(
    'a b',
    (token) =>
      token[0] === TokenType.Ident ? token[4].value.toUpperCase() : undefined,
    undefined,
    parsed
  );
  assert.equal(result, 'A B');
});

describe('rewrite()', () => {
  test('returns the input untouched when the callback edits nothing', () => {
    const value = 'a  counter(b, c) [d]';
    assert.strictEqual(
      rewrite(value, () => undefined),
      value
    );
  });

  test('keeps the text between edits exactly as written', () => {
    const result = rewrite('a  b\tc', (token) => {
      if (token[0] === TokenType.Whitespace) return ' ';
      if (token[0] === TokenType.Ident) return token[4].value.toUpperCase();
      return undefined;
    });
    assert.strictEqual(result, 'A B C');
  });

  test('writes the replacement raw, replacing the escaped spelling', () => {
    const result = rewrite('\\66 oo', (token) =>
      token[0] === TokenType.Ident ? 'a' : undefined
    );
    assert.strictEqual(result, 'a');
  });

  test('marks only the argument slots the function map names', () => {
    const seen = [];
    rewrite(
      'counter(item, decimal)',
      (token, position) => {
        if (token[0] === TokenType.Ident) seen.push([token[4].value, position]);
      },
      counter.functions
    );
    assert.deepEqual(seen, [
      ['item', 'argument'],
      ['decimal', 'nested'],
    ]);
  });

  test('marks an ident against the function it is written in', () => {
    const seen = [];
    rewrite(
      'target-counter(attr(href), section)',
      (token, position) => {
        if (token[0] === TokenType.Ident) seen.push([token[4].value, position]);
      },
      counter.functions
    );
    assert.deepEqual(seen, [
      ['href', 'nested'],
      ['section', 'argument'],
    ]);
  });

  test('counts commas per function frame', () => {
    const seen = [];
    rewrite(
      'counters(item, ".", counter(page))',
      (token, position) => {
        if (token[0] === TokenType.Ident) seen.push([token[4].value, position]);
      },
      counter.functions
    );
    assert.deepEqual(seen, [
      ['item', 'argument'],
      ['page', 'argument'],
    ]);
  });

  test('marks idents inside substitution functions nested', () => {
    const seen = [];
    rewrite(
      'var(--item) env(--section) attr(data-label)',
      (token, position) => {
        if (token[0] === TokenType.Ident) seen.push([token[4].value, position]);
      },
      counter.functions
    );
    assert.deepEqual(seen, [
      ['--item', 'nested'],
      ['--section', 'nested'],
      ['data-label', 'nested'],
    ]);
  });

  test('marks idents nested in a substitution function through other frames', () => {
    const seen = [];
    rewrite(
      'counter(var(--counter, section))',
      (token, position) => {
        if (token[0] === TokenType.Ident) seen.push([token[4].value, position]);
      },
      counter.functions
    );
    assert.deepEqual(seen, [
      ['--counter', 'nested'],
      ['section', 'nested'],
    ]);
  });

  test('marks idents inside an unmapped function nested', () => {
    const seen = [];
    rewrite(
      'steps(3, jump-none)',
      (token, position) => {
        if (token[0] === TokenType.Ident) seen.push([token[4].value, position]);
      },
      counter.functions
    );
    assert.deepEqual(seen, [['jump-none', 'nested']]);
  });

  test('marks an argument of a function the map knows by its slots', () => {
    const seen = [];
    rewrite(
      'reversed(item)',
      (token, position) => {
        if (token[0] === TokenType.Ident) seen.push([token[4].value, position]);
      },
      new Map([['reversed', [0]]])
    );
    assert.deepEqual(seen, [['item', 'argument']]);
  });

  test('treats strings and comments as opaque tokens', () => {
    const kinds = [];
    rewrite('"counter(x)"/*counter(y)*/', (token) => {
      kinds.push(token[0]);
    });
    assert.deepEqual(kinds, [TokenType.String, TokenType.Comment]);
  });

  test('marks idents between square brackets bracketed, also inside a function', () => {
    const seen = [];
    rewrite(
      'repeat(2, [head tail] 1fr)',
      (token, position) => {
        if (token[0] === TokenType.Ident) seen.push([token[4].value, position]);
      },
      counter.functions
    );
    assert.deepEqual(seen, [
      ['head', 'bracketed'],
      ['tail', 'bracketed'],
    ]);
  });

  test('marks non-identifier tokens other, never bare', () => {
    const seen = [];
    rewrite(
      'counter(  item  , "x")',
      (token, position) => {
        if (token[0] !== TokenType.Ident) seen.push(position);
      },
      counter.functions
    );
    // Expect `other` for the function, whitespace runs, comma, string, and
    // closing parenthesis.
    assert.deepEqual(seen, [
      'other',
      'other',
      'other',
      'other',
      'other',
      'other',
      'other',
    ]);
  });

  test('marks a string inside a substitution function nested', () => {
    const seen = [];
    rewrite('var(--x, "a b")', (token, position) => {
      if (token[0] === TokenType.String) seen.push(position);
    });
    assert.deepEqual(seen, ['nested']);
  });

  test('marks bracketed idents nested inside a substitution function', () => {
    const seen = [];
    rewrite(
      'var(--cols, [head] 1fr)',
      (token, position) => {
        if (token[0] === TokenType.Ident) seen.push([token[4].value, position]);
      },
      counter.functions
    );
    assert.deepEqual(seen, [
      ['--cols', 'nested'],
      ['head', 'nested'],
    ]);
  });

  test('survives unbalanced brackets', () => {
    const result = rewrite('repeat(2, [a', (token) =>
      token[0] === TokenType.Ident ? 'x' : undefined
    );
    assert.strictEqual(result, 'repeat(2, [x');
  });
});
