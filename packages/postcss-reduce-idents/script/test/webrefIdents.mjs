import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIdentSlots,
  directReferences,
  functionArguments,
  keywordTerminals,
} from '../lib/webrefIdents.mjs';

/**
 * The bare minimum webref data a slot can be derived from, so that a case says
 * what it is about rather than restating a whole specification.
 *
 * @param {Partial<import('../lib/webrefIdents.mjs').WebrefData>} data
 * @return {import('../lib/webrefIdents.mjs').WebrefData}
 */
function webref({ properties = [], atrules = [], types = [], functions = [] }) {
  return {
    properties,
    atrules: [{ name: '@keyframes' }, { name: '@counter-style' }, ...atrules],
    types,
    functions,
  };
}

test('reads the productions a grammar names', () => {
  assert.deepStrictEqual(
    directReferences("<'grid-template-rows'> / <integer [1,∞]> <counter()>"),
    ["'grid-template-rows'", 'integer', 'counter()']
  );
});

test('tells a keyword from a function spelled out in a grammar', () => {
  assert.deepStrictEqual(
    keywordTerminals('none | auto-flow | minmax( <length>, <length> ) | dense'),
    ['none', 'auto-flow', 'dense']
  );
});

test('splits a function grammar at its own commas only', () => {
  assert.deepStrictEqual(
    functionArguments(
      'target-counter( [ <string> | <url> ] , <custom-ident> )'
    ),
    ['[ <string> | <url> ]', '<custom-ident>']
  );
});

test('follows a grammar to the identifier it can hold', () => {
  const data = buildIdentSlots(
    webref({
      properties: [
        { name: 'animation', syntax: '<single-animation>#' },
        { name: 'animation-name', syntax: '[ none | <keyframes-name> ]#' },
        { name: 'animation-duration', syntax: '<time>#' },
      ],
      types: [
        { name: 'single-animation', syntax: "<time> || <'animation-name'>" },
        { name: 'keyframes-name', syntax: '<custom-ident> | <string>' },
      ],
    })
  );
  assert.deepStrictEqual(data.keyframes.properties, [
    'animation',
    'animation-name',
  ]);
});

test('leaves a prefixed spelling to be resolved through its alias', () => {
  const data = buildIdentSlots(
    webref({
      properties: [
        { name: 'animation-name', syntax: '<keyframes-name>' },
        {
          name: '-webkit-animation-name',
          syntax: '<keyframes-name>',
          legacyAliasOf: 'animation-name',
        },
      ],
      types: [{ name: 'keyframes-name', syntax: '<custom-ident>' }],
    })
  );
  assert.deepStrictEqual(data.keyframes.properties, ['animation-name']);
  assert.strictEqual(
    data.aliases.get('-webkit-animation-name'),
    'animation-name'
  );
});

test('keeps an identifier that only a function can hold out of the bare slots', () => {
  const data = buildIdentSlots(
    webref({
      properties: [
        { name: 'list-style-type', syntax: '<counter-style> | none' },
        { name: 'content', syntax: '<counter()>' },
      ],
      types: [
        { name: 'counter-style', syntax: '<counter-style-name> | <symbols()>' },
        { name: 'counter-style-name', syntax: '<custom-ident>' },
      ],
      functions: [
        { name: 'symbols()', syntax: 'symbols( <string>+ )' },
        {
          name: 'counter()',
          syntax: 'counter( <counter-name>, <counter-style>? )',
        },
      ],
    })
  );
  assert.deepStrictEqual(data.counterStyle.properties, ['list-style-type']);
  assert.deepStrictEqual(data.counterStyle.functionProperties, ['content']);
});

test('records which argument of a function names a counter and which a style', () => {
  const data = buildIdentSlots(
    webref({
      types: [{ name: 'counter-style', syntax: '<counter-style-name>' }],
      functions: [
        {
          name: 'counters()',
          syntax: 'counters( <counter-name>, <string>, <counter-style>? )',
        },
        // The specification spells the counter `<custom-ident>` here, so the
        // counter style argument is what marks this out as a counter function.
        {
          name: 'target-counter()',
          syntax:
            'target-counter( [ <string> | <url> ] , <custom-ident> , <counter-style>? )',
        },
        { name: 'attr()', syntax: 'attr( <attr-name>, <declaration-value>? )' },
      ],
    })
  );
  assert.deepStrictEqual(data.counter.functions.get('counters()'), [0]);
  assert.deepStrictEqual(data.counterStyle.functions.get('counters()'), [2]);
  assert.deepStrictEqual(data.counter.functions.get('target-counter()'), [1]);
  assert.deepStrictEqual(
    data.counterStyle.functions.get('target-counter()'),
    [2]
  );
  assert.strictEqual(data.counter.functions.has('attr()'), false);
});

test('counts a shorthand that sets grid-template-areas as naming grid areas', () => {
  const data = buildIdentSlots(
    webref({
      properties: [
        { name: 'grid', longhands: ['grid-template'] },
        { name: 'grid-template', longhands: ['grid-template-areas'] },
        { name: 'grid-template-areas', syntax: 'none | <string>+' },
        { name: 'grid-auto-flow', syntax: '[ row | column ] || dense' },
      ],
    })
  );
  assert.deepStrictEqual(data.grid.templateProperties, [
    'grid',
    'grid-template',
    'grid-template-areas',
  ]);
});

test('reserves the keywords a declaration of the same property can hold', () => {
  const data = buildIdentSlots(
    webref({
      properties: [
        { name: 'animation', syntax: '<easing-function> || <keyframes-name>' },
      ],
      types: [
        { name: 'keyframes-name', syntax: '<custom-ident>' },
        {
          name: 'easing-function',
          syntax: 'linear | ease | steps( <integer> )',
        },
      ],
    })
  );
  assert.deepStrictEqual(data.keyframes.reservedKeywords, ['ease', 'linear']);
});

test('pools the alternatives of a production more than one spec defines', () => {
  const data = buildIdentSlots(
    webref({
      properties: [{ name: 'content', syntax: '<content-list>' }],
      types: [
        { name: 'content-list', syntax: '<string>+' },
        { name: 'content-list', syntax: '<counter()>' },
      ],
      functions: [
        {
          name: 'counter()',
          syntax: 'counter( <counter-name>, <counter-style>? )',
        },
      ],
    })
  );
  assert.deepStrictEqual(data.counter.functionProperties, ['content']);
});
