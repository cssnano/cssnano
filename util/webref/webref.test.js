import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cssWideKeywords,
  expectAll,
  expectNone,
  grammarsByName,
  isFlowRelative,
  keywordsOf,
  serializeJson,
  sortedByName,
} from './webref.js';

describe('grammarsByName', () => {
  test('pools the alternatives of a production defined by two specs', () => {
    const grammars = grammarsByName({
      properties: [],
      types: [
        { name: 'content-list', syntax: '<string>' },
        { name: 'content-list', syntax: '<counter()>' },
      ],
      functions: [],
    });

    assert.strictEqual(grammars.get('content-list'), '<string> | <counter()>');
  });

  test('keys a function by the name its references spell', () => {
    const grammars = grammarsByName({
      properties: [],
      types: [],
      functions: [{ name: 'counter()', syntax: 'counter( <counter-name> )' }],
    });

    assert.strictEqual(grammars.get('counter()'), 'counter( <counter-name> )');
  });

  test('keys a property by its quoted name, apart from a type of that name', () => {
    const grammars = grammarsByName({
      properties: [{ name: 'color', syntax: '<color>' }],
      types: [{ name: 'color', syntax: 'red | blue' }],
      functions: [],
    });

    assert.deepStrictEqual(
      [grammars.get("'color'"), grammars.get('color')],
      ['<color>', 'red | blue']
    );
  });

  test('leaves out a definition that has no grammar', () => {
    const grammars = grammarsByName({
      properties: [{ name: 'speak' }],
      types: [{ name: 'prose-only' }],
      functions: [{ name: 'prose-only()' }],
    });

    assert.strictEqual(grammars.size, 0);
  });

  test('accepts data that has no types or functions', () => {
    const grammars = grammarsByName({
      properties: [{ name: 'fill', syntax: '<paint>' }],
    });

    assert.deepStrictEqual([...grammars], [["'fill'", '<paint>']]);
  });
});

describe('keywordsOf', () => {
  test('returns the keyword alternatives in sorted order', () => {
    assert.deepStrictEqual(keywordsOf('none | auto | inherit'), [
      'auto',
      'inherit',
      'none',
    ]);
  });

  test('ignores an alternative that references another production', () => {
    assert.deepStrictEqual(keywordsOf('<length> | auto'), ['auto']);
  });

  test('ignores an alternative that is more than one keyword', () => {
    assert.deepStrictEqual(keywordsOf('auto | span 2'), ['auto']);
  });

  test('ignores a function call alternative', () => {
    assert.deepStrictEqual(keywordsOf('none | rgb( 0 0 0 )'), ['none']);
  });

  test('returns nothing for a missing grammar', () => {
    assert.deepStrictEqual(keywordsOf(undefined), []);
  });
});

describe('cssWideKeywords', () => {
  test('reads the keywords from the grammar of the all property', () => {
    const properties = [
      { name: 'color', syntax: '<color> | transparent' },
      { name: 'all', syntax: 'initial | inherit | unset | revert-rule' },
    ];

    assert.deepStrictEqual(cssWideKeywords({ properties }), [
      'inherit',
      'initial',
      'revert-rule',
      'unset',
    ]);
  });

  test('leaves out references to other productions', () => {
    const properties = [{ name: 'all', syntax: 'initial | <custom>' }];

    assert.deepStrictEqual(cssWideKeywords({ properties }), ['initial']);
  });

  test('returns nothing when the data has no all property', () => {
    assert.deepStrictEqual(cssWideKeywords({ properties: [] }), []);
  });
});

describe('isFlowRelative', () => {
  for (const [name, expected] of [
    ['margin-inline-start', true],
    ['inline-size', true],
    ['border-start-start-radius', true],
    ['border-inline-start-width', true],
    ['margin-top', false],
    ['width', false],
    ['border-top-left-radius', false],
    ['border-left-width', false],
    // `inline` and `block` only count as whole segments
    ['baseline-source', false],
  ]) {
    test(`isFlowRelative(${name}) is ${expected}`, () => {
      assert.strictEqual(isFlowRelative(name), expected);
    });
  }
});

describe('sortedByName', () => {
  test('orders entries by name without mutating the input', () => {
    const entries = [
      ['b', 1],
      ['a', 2],
    ];
    assert.deepStrictEqual(sortedByName(entries), [
      ['a', 2],
      ['b', 1],
    ]);
    assert.deepStrictEqual(entries[0], ['b', 1]);
  });
});

describe('expectAll and expectNone', () => {
  test('expectAll names the missing entry', () => {
    assert.throws(
      () => expectAll(['a'], ['a', 'b'], 'the set'),
      /the set to include b/v
    );
  });

  test('expectNone names the forbidden entry', () => {
    assert.throws(
      () => expectNone(['a'], ['a'], 'the set'),
      /the set not to include a/v
    );
  });
});

describe('serializeJson', () => {
  test('indents with two spaces and ends with a newline', () => {
    assert.equal(serializeJson({ a: [1] }), '{\n  "a": [\n    1\n  ]\n}\n');
  });

  test('round-trips the data', () => {
    const data = { a: ['x', 'y'], b: { c: 1 } };
    assert.deepEqual(JSON.parse(serializeJson(data)), data);
  });
});
