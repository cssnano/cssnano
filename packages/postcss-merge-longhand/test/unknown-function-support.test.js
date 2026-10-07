import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import {
  mergeBlockingSupport,
  requiredSupport,
} from '../src/lib/isFallback.js';

/**
 * A browser that does not parse a function drops the declaration whole, so a
 * shorthand built around `calc(sibling-index() * 1px)` loses every side the
 * longhands would have kept. No target list proves that every browser parses
 * a function the plugin has no data for.
 *
 * @param {string} css
 * @param {string} browsers
 * @return {Promise<string>}
 */
async function run(css, browsers) {
  const result = await postcss([
    plugin({ overrideBrowserslist: browsers }),
  ]).process(css, { from: undefined });
  return result.css;
}

const requires = (/** @type {string} */ value) =>
  requiredSupport(postcss.decl({ prop: 'width', value }));

const targets = ['ie 11', 'chrome 120'];

/** Each case stays as written because one side needs a function that an older browser does not parse. */
const unchanged = [
  [
    'margin',
    'margin-top:calc(anchor-size(width));margin-right:5px;margin-bottom:0;margin-left:0',
  ],
  ['inset', 'top:calc(anchor(--a top));right:0;bottom:0;left:0'],
  [
    'border-width',
    'border-top-width:calc(sibling-index() * 1px);border-right-width:1px;border-bottom-width:1px;border-left-width:1px',
  ],
  [
    'border-width over its shorthand',
    'border-width:1px;border-top-width:calc(sibling-index() * 1px)',
  ],
  [
    'border-radius',
    'border-top-left-radius:calc(sibling-index() * 1px);border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px',
  ],
  ['columns', 'column-width:calc(sibling-index() * 1px);column-count:2'],
];

describe('unknown function nested in calc()', () => {
  for (const browsers of targets) {
    for (const [family, declarations] of unchanged) {
      test(`stays unmerged for ${family} with ${browsers}`, async () => {
        assert.equal(
          await run(`a{${declarations}}`, browsers),
          `a{${declarations}}`
        );
      });
    }
  }
});

describe('calc() of longstanding syntax', () => {
  const merges = [
    [
      'border-width',
      'border-top-width:calc(1px);border-right-width:1px;border-bottom-width:1px;border-left-width:1px',
      'border-width:calc(1px) 1px 1px',
    ],
    [
      'border-radius',
      'border-top-left-radius:calc(1px);border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px',
      'border-radius:calc(1px) 1px 1px',
    ],
    ['columns', 'column-width:calc(1px);column-count:2', 'columns:calc(1px) 2'],
  ];

  for (const [family, input, output] of merges) {
    test(`still merges for ${family}, as authors write calc() without a fallback`, async () => {
      assert.equal(await run(`a{${input}}`, 'chrome 120'), `a{${output}}`);
    });
  }
});

describe('support required by a function', () => {
  test('includes the function name for a function no data covers', () => {
    assert.deepEqual(
      requires('calc(sibling-index() * 1px)'),
      new Set(['calc', 'function:sibling-index'])
    );
  });

  test('reads a function name in any letter case', () => {
    assert.deepEqual(
      requires('Sibling-Index()'),
      new Set(['function:sibling-index'])
    );
  });

  test('reads an escaped function name', () => {
    assert.deepEqual(
      requires('sibling-\\69 ndex()'),
      new Set(['function:sibling-index'])
    );
  });

  test('includes nothing for url(), which every browser parses', () => {
    assert.deepEqual(requires('url(a.png)'), new Set());
  });

  test('includes nothing for rgb(), which every browser parses', () => {
    assert.deepEqual(requires('rgb(0 0 0)'), new Set());
  });

  test('blocks a merge for a function no data covers', () => {
    assert.deepEqual(
      mergeBlockingSupport(
        postcss.decl({ prop: 'width', value: 'calc(anchor-size(width))' })
      ),
      new Set(['calc', 'function:anchor-size'])
    );
  });
});
