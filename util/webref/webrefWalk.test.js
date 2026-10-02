import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { grammarsByName } from './webref.js';
import {
  counterFunctionSlots,
  descriptorsWhere,
  easingFunction,
  propertyReach,
  reachableProductions,
  validateEasingFunction,
} from './webrefWalk.js';

describe('reachableProductions', () => {
  const grammars = grammarsByName({
    properties: [],
    types: [
      { name: 'outer', syntax: 'a | <inner>' },
      { name: 'inner', syntax: 'b | <outer> | <fn()>' },
    ],
    functions: [{ name: 'fn()', syntax: 'fn( hidden )' }],
  });

  test('collects keywords of every production reached', () => {
    assert.deepStrictEqual(
      reachableProductions(grammars, '<outer>').keywords,
      new Set(['a', 'b'])
    );
  });

  test('terminates on productions that refer to each other', () => {
    assert.deepStrictEqual(
      reachableProductions(grammars, '<outer>').references,
      new Set(['outer', 'inner', 'fn()'])
    );
  });

  test('does not descend into function arguments', () => {
    assert.ok(!reachableProductions(grammars, '<fn()>').keywords.has('hidden'));
  });

  test('reports a production without a grammar rather than failing', () => {
    assert.ok(
      reachableProductions(grammars, '<length>').references.has('length')
    );
  });
});

describe('propertyReach', () => {
  test('leaves out vendor prefixed spellings and --*', () => {
    const properties = [
      { name: 'color', syntax: '<color>' },
      { name: '-webkit-color', syntax: '<color>', legacyAliasOf: 'color' },
      { name: '--*', syntax: '<declaration-value>?' },
    ];
    assert.deepStrictEqual(
      [...propertyReach(properties, grammarsByName({ properties })).keys()],
      ['color']
    );
  });
});

describe('descriptorsWhere', () => {
  test('returns the matching descriptors ordered by name', () => {
    const atrules = [
      {
        name: '@x',
        descriptors: [
          { name: 'b', syntax: 'yes' },
          { name: 'a', syntax: 'yes' },
          { name: 'c', syntax: 'no' },
          { name: 'd' },
        ],
      },
    ];
    assert.deepStrictEqual(
      descriptorsWhere(atrules, '@x', (syntax) => syntax === 'yes').map(
        ({ name }) => name
      ),
      ['a', 'b']
    );
  });
});

describe('counterFunctionSlots', () => {
  test('counts an identifier argument as a counter name only when the function takes a counter style', () => {
    const { counterFunctions, counterStyleFunctions } = counterFunctionSlots([
      {
        name: 'counter()',
        syntax: 'counter( <counter-name>, <counter-style>? )',
      },
      { name: 'attr()', syntax: 'attr( <custom-ident>, <string> )' },
    ]);
    assert.deepStrictEqual([...counterFunctions], [['counter()', [0]]]);
    assert.deepStrictEqual([...counterStyleFunctions], [['counter()', [1]]]);
  });
});

describe('easingFunction', () => {
  const types = [
    {
      name: 'easing-function',
      syntax: '<linear-easing-function> | <cubic-bezier-easing-function>',
    },
    { name: 'linear-easing-function', syntax: 'linear | <linear()>' },
    {
      name: 'cubic-bezier-easing-function',
      syntax: 'ease | ease-in | <cubic-bezier()> | <steps()>',
    },
  ];
  const properties = [];

  test('collects lower-cased keywords and function names through referenced types', () => {
    assert.deepStrictEqual(easingFunction({ properties, types }), {
      keywords: ['ease', 'ease-in', 'linear'],
      functions: ['cubic-bezier', 'linear', 'steps'],
    });
  });

  test('resolves a property reference to the property, not to a type of the same name', () => {
    assert.deepStrictEqual(
      easingFunction({
        properties: [{ name: 'x', syntax: 'ease' }],
        types: [
          { name: 'easing-function', syntax: "<'x'>" },
          { name: 'x', syntax: 'step-end' },
        ],
      }).keywords,
      ['ease']
    );
  });

  test('rejects a referenced type that webref does not define', () => {
    assert.throws(
      () =>
        easingFunction({
          properties,
          types: [{ name: 'easing-function', syntax: '<missing>' }],
        }),
      /does not define <missing>/v
    );
  });
});

describe('validateEasingFunction', () => {
  const expected = {
    keywords: [
      'ease',
      'ease-in',
      'ease-in-out',
      'ease-out',
      'linear',
      'step-end',
      'step-start',
    ],
    functions: ['cubic-bezier', 'linear', 'steps'],
  };

  test('accepts the keywords and functions CSS Easing defines', () => {
    assert.doesNotThrow(() => validateEasingFunction(expected));
  });

  test('rejects a missing keyword', () => {
    assert.throws(
      () =>
        validateEasingFunction({ ...expected, keywords: ['ease', 'linear'] }),
      /Unexpected easing keywords/v
    );
  });

  test('rejects a keyword that is new, so that a person reviews it', () => {
    assert.throws(
      () =>
        validateEasingFunction({
          ...expected,
          keywords: [...expected.keywords, 'bounce'],
        }),
      /Unexpected easing keywords/v
    );
  });

  test('rejects a new function', () => {
    assert.throws(
      () =>
        validateEasingFunction({
          ...expected,
          functions: [...expected.functions, 'spring'],
        }),
      /Unexpected easing functions/v
    );
  });
});
