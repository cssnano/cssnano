import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMergeIdents,
  directReferences,
  functionArguments,
  validate,
} from '../lib/webrefMergeIdents.mjs';

/**
 * The bare minimum webref data the tables can be derived from, so that a
 * case says what it is about rather than restating a whole specification.
 *
 * @param {Partial<import('../lib/webrefMergeIdents.mjs').WebrefData>} data
 * @return {import('../lib/webrefMergeIdents.mjs').WebrefData}
 */
function webref({ properties = [], atrules = [], types = [], functions = [] }) {
  return {
    properties,
    atrules: [{ name: '@counter-style' }, ...atrules],
    types,
    functions,
  };
}

/**
 * A stand-in that satisfies every expectation `validate` holds, so that a
 * case can degrade one piece of it and watch `validate` catch exactly that.
 *
 * @return {import('../lib/webrefMergeIdents.mjs').WebrefData}
 */
function validWebref() {
  return webref({
    properties: [
      {
        name: 'all',
        syntax:
          'initial | inherit | unset | revert | revert-layer | revert-rule',
      },
      { name: 'animation', syntax: '<single-animation>#' },
      { name: 'animation-name', syntax: '[ none | <keyframes-name> ]#' },
      { name: 'animation-direction', syntax: '<single-animation-direction>#' },
      { name: 'animation-fill-mode', syntax: '<single-animation-fill-mode>#' },
      {
        name: 'animation-play-state',
        syntax: '<single-animation-play-state>#',
      },
      {
        name: 'animation-iteration-count',
        syntax: '<single-animation-iteration-count>#',
      },
      {
        name: 'list-style',
        syntax: "<'list-style-position'> || <'list-style-type'>",
      },
      { name: 'list-style-position', syntax: 'inside | outside' },
      { name: 'list-style-type', syntax: '<counter-style> | <string> | none' },
    ],
    atrules: [
      {
        name: '@counter-style',
        descriptors: [
          {
            name: 'system',
            syntax:
              'cyclic | numeric | alphabetic | symbolic | additive | fixed <integer>? | extends <counter-style-name>',
          },
          {
            name: 'speak-as',
            syntax:
              'auto | bullets | numbers | words | spell-out | <counter-style-name>',
          },
          { name: 'fallback', syntax: '<counter-style-name>' },
        ],
      },
    ],
    types: [
      {
        name: 'single-animation',
        syntax:
          "<time> || <easing-function> || <single-animation-timeline> || [ none | <keyframes-name> ] || <'animation-direction'> || <'animation-fill-mode'> || <'animation-play-state'> || <'animation-iteration-count'>",
      },
      {
        name: 'easing-function',
        syntax:
          'linear | ease | ease-in | ease-out | ease-in-out | step-start | step-end | steps( <integer> )',
      },
      { name: 'single-animation-timeline', syntax: 'auto | none' },
      {
        name: 'single-animation-direction',
        syntax: 'normal | reverse | alternate | alternate-reverse',
      },
      {
        name: 'single-animation-fill-mode',
        syntax: 'none | forwards | backwards | both',
      },
      { name: 'single-animation-play-state', syntax: 'running | paused' },
      {
        name: 'single-animation-iteration-count',
        syntax: 'infinite | <integer>',
      },
      { name: 'keyframes-name', syntax: '<custom-ident> | <string>' },
      { name: 'counter-style', syntax: '<counter-style-name> | <symbols()>' },
    ],
    functions: [
      {
        name: 'counter()',
        syntax: 'counter( <counter-name>, <counter-style>? )',
      },
      {
        name: 'counters()',
        syntax: 'counters( <counter-name>, <string>, <counter-style>? )',
      },
      {
        name: 'target-counter()',
        syntax:
          'target-counter( [ <string> | <url> ] , <custom-ident> , <counter-style>? )',
      },
      {
        name: 'target-counters()',
        syntax:
          'target-counters( [ <string> | <url> ] , <custom-ident> , <string> , <counter-style>? )',
      },
    ],
  });
}

test('reads the productions a grammar names', () => {
  assert.deepStrictEqual(
    directReferences("<'list-style-position'> || <'list-style-type'>"),
    ["'list-style-position'", "'list-style-type'"]
  );
});

test('splits a function grammar at its own commas only', () => {
  assert.deepStrictEqual(
    functionArguments(
      'target-counters( [ <string> | <url> ] , <custom-ident> , <string> , <counter-style>? )'
    ),
    ['[ <string> | <url> ]', '<custom-ident>', '<string>', '<counter-style>?']
  );
});

test('derives the CSS-wide keywords from the all property', () => {
  const data = buildMergeIdents(
    webref({
      properties: [
        {
          name: 'all',
          syntax:
            'initial | inherit | unset | revert | revert-layer | revert-rule',
        },
      ],
    })
  );
  assert.deepStrictEqual(data.cssWideKeywords, [
    'inherit',
    'initial',
    'revert',
    'revert-layer',
    'revert-rule',
    'unset',
  ]);
});

test('follows an animation value to the keywords a keyframes name is ambiguous with', () => {
  const data = buildMergeIdents(
    webref({
      properties: [
        { name: 'animation', syntax: '<single-animation>#' },
        { name: 'animation-name', syntax: '[ none | <keyframes-name> ]#' },
        {
          name: 'animation-direction',
          syntax: '<single-animation-direction>#',
        },
      ],
      types: [
        {
          name: 'single-animation',
          syntax:
            "<time> || <easing-function> || [ none | <keyframes-name> ] || <'animation-direction'>",
        },
        {
          name: 'easing-function',
          syntax: 'linear | ease | step-start | step-end | steps( <integer> )',
        },
        { name: 'keyframes-name', syntax: '<custom-ident> | <string>' },
        {
          name: 'single-animation-direction',
          syntax: 'normal | reverse | alternate | alternate-reverse',
        },
      ],
    })
  );
  assert.deepStrictEqual(data.keyframes.shorthandKeywords, [
    'alternate',
    'alternate-reverse',
    'ease',
    'linear',
    'none',
    'normal',
    'reverse',
    'step-end',
    'step-start',
  ]);
});

test('does not follow a function reference into the productions it names', () => {
  // A word the value holds inside steps() stays a keyword, but the grammar
  // of the production steps() names is not written where the function is.
  const data = buildMergeIdents(
    webref({
      properties: [{ name: 'animation', syntax: 'steps( <step-position> )#' }],
      types: [{ name: 'step-position', syntax: 'jump-start | jump-end' }],
    })
  );
  assert.deepStrictEqual(data.keyframes.shorthandKeywords, [
    'jump-end',
    'jump-start',
  ]);
});

test('reserves the keywords a list style value can hold, through property references', () => {
  const data = buildMergeIdents(
    webref({
      properties: [
        {
          name: 'list-style',
          syntax: "<'list-style-position'> || <'list-style-type'>",
        },
        { name: 'list-style-position', syntax: 'inside | outside' },
        {
          name: 'list-style-type',
          syntax: '<counter-style> | <string> | none',
        },
      ],
      types: [
        { name: 'counter-style', syntax: '<counter-style-name> | <symbols()>' },
      ],
    })
  );
  assert.deepStrictEqual(data.counterStyle.keywords, [
    'inside',
    'none',
    'outside',
  ]);
});

test('reserves the keywords of descriptors that can hold a counter style name', () => {
  const data = buildMergeIdents(
    webref({
      properties: [{ name: 'list-style-type', syntax: '<counter-style-name>' }],
      atrules: [
        {
          name: '@counter-style',
          descriptors: [
            {
              name: 'speak-as',
              syntax:
                'auto | bullets | numbers | words | spell-out | <counter-style-name>',
            },
            // `pad` cannot hold a counter style name, so its `""` symbol
            // grammar contributes nothing and its keywords stay unreserved.
            { name: 'pad', syntax: '<integer [0,∞]> && <symbol>' },
            { name: 'fallback', syntax: '<counter-style-name>' },
          ],
        },
      ],
    })
  );
  assert.deepStrictEqual(data.counterStyle.keywords, [
    'auto',
    'bullets',
    'numbers',
    'spell-out',
    'words',
  ]);
});

test('finds the argument the counter functions take a counter style at', () => {
  const data = buildMergeIdents(
    webref({
      functions: [
        {
          name: 'counter()',
          syntax: 'counter( <counter-name>, <counter-style>? )',
        },
        {
          name: 'counters()',
          syntax: 'counters( <counter-name>, <string>, <counter-style>? )',
        },
        {
          name: 'target-counter()',
          syntax:
            'target-counter( [ <string> | <url> ] , <custom-ident> , <counter-style>? )',
        },
        {
          name: 'target-counters()',
          syntax:
            'target-counters( [ <string> | <url> ] , <custom-ident> , <string> , <counter-style>? )',
        },
        // A counter name is not a counter style, so `counter-reset`'s slot
        // stays out of the map.
        {
          name: 'leader()',
          syntax: 'leader( dotted | solid | space | <string> )',
        },
      ],
    })
  );
  assert.deepStrictEqual(
    [...data.counterStyle.functions],
    [
      ['counter()', [1]],
      ['counters()', [2]],
      ['target-counter()', [2]],
      ['target-counters()', [3]],
    ]
  );
});

test('pools the alternatives of a production two specs define', () => {
  const data = buildMergeIdents(
    webref({
      properties: [{ name: 'list-style-type', syntax: '<counter-style>' }],
      types: [
        { name: 'counter-style', syntax: '<counter-style-name>' },
        { name: 'counter-style', syntax: 'decimal' },
      ],
    })
  );
  assert.deepStrictEqual(data.counterStyle.keywords, ['decimal']);
});

test('validates a complete stand-in and rejects gutted data', () => {
  assert.doesNotThrow(() => validate(buildMergeIdents(validWebref())));

  const missingWide = buildMergeIdents(validWebref());
  missingWide.cssWideKeywords = missingWide.cssWideKeywords.filter(
    (keyword) => keyword !== 'unset'
  );
  assert.throws(() => validate(missingWide), /CSS-wide keywords/v);

  const missingShorthand = buildMergeIdents(validWebref());
  missingShorthand.keyframes.shorthandKeywords =
    missingShorthand.keyframes.shorthandKeywords.filter(
      (keyword) => keyword !== 'alternate'
    );
  assert.throws(() => validate(missingShorthand), /animation value can hold/v);

  const missingDescriptor = buildMergeIdents(validWebref());
  missingDescriptor.counterStyle.keywords =
    missingDescriptor.counterStyle.keywords.filter(
      (keyword) => keyword !== 'spell-out'
    );
  assert.throws(
    () => validate(missingDescriptor),
    /counter style descriptor can hold/v
  );

  const movedSlot = buildMergeIdents(validWebref());
  movedSlot.counterStyle.functions.set('counter()', [0]);
  assert.throws(
    () => validate(movedSlot),
    /counter\(\) to take a counter style/v
  );

  const lostSlot = buildMergeIdents(validWebref());
  lostSlot.counterStyle.functions.delete('target-counters()');
  assert.throws(
    () => validate(lostSlot),
    /target-counters\(\) to take a counter style/v
  );
});
