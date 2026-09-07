import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import {
  buildShorthandIdentities,
  serializeShorthandIdentities,
  validateShorthandIdentities,
} from '../lib/webrefShorthandIdentities.mjs';

function webref() {
  return {
    properties: [
      {
        name: 'place-content',
        longhands: ['align-content', 'justify-content'],
      },
      { name: 'place-items', longhands: ['align-items', 'justify-items'] },
      { name: 'place-self', longhands: ['align-self', 'justify-self'] },
      {
        name: 'align-content',
        syntax:
          'normal | <baseline-position> | <content-distribution> | <overflow-position>? <content-position>',
      },
      {
        name: 'justify-content',
        syntax:
          'normal | <content-distribution> | <overflow-position>? [ <content-position> | left | right ]',
      },
      {
        name: 'align-items',
        syntax:
          'normal | stretch | <baseline-position> | <overflow-position>? <self-position>',
      },
      {
        name: 'justify-items',
        syntax:
          'normal | stretch | <baseline-position> | <overflow-position>? [ <self-position> | left | right ] | legacy',
      },
      {
        name: 'align-self',
        syntax:
          'auto | <overflow-position>? [ normal | <self-position> ] | stretch | <baseline-position> | anchor-center',
      },
      {
        name: 'justify-self',
        syntax:
          'auto | <overflow-position>? [ normal | <self-position> | left | right ] | stretch | <baseline-position> | anchor-center',
      },
    ],
    types: [
      { name: 'baseline-position', syntax: '[ first | last ]? && baseline' },
      {
        name: 'content-distribution',
        syntax: 'space-between | space-around | space-evenly | stretch',
      },
      { name: 'overflow-position', syntax: 'unsafe | safe' },
      {
        name: 'content-position',
        syntax: 'center | start | end | flex-start | flex-end',
      },
      {
        name: 'self-position',
        syntax:
          'center | start | end | self-start | self-end | flex-start | flex-end',
      },
      {
        name: 'easing-function',
        syntax:
          '<linear-easing-function> | <cubic-bezier-easing-function> | <step-easing-function>',
      },
      {
        name: 'linear-easing-function',
        syntax: 'linear | <linear()>',
      },
      {
        name: 'cubic-bezier-easing-function',
        syntax: 'ease | ease-in | ease-out | ease-in-out | <cubic-bezier()>',
      },
      {
        name: 'step-easing-function',
        syntax: 'step-start | step-end | <steps()>',
      },
    ],
    functions: [],
  };
}

suite('buildShorthandIdentities', () => {
  test('derives accepted forms for each alignment shorthand', () => {
    const data = buildShorthandIdentities(webref());
    assert.ok(data.alignment.get('place-content')?.includes('space-between'));
    assert.ok(data.alignment.get('place-items')?.includes('first baseline'));
    assert.ok(data.alignment.get('place-self')?.includes('auto'));
    assert.ok(!data.alignment.get('place-content')?.includes('baseline'));
    assert.ok(!data.alignment.get('place-items')?.includes('auto'));
  });

  test('derives easing keywords and functions through referenced types', () => {
    const { easing } = buildShorthandIdentities(webref());
    assert.deepStrictEqual(easing.keywords, [
      'ease',
      'ease-in',
      'ease-in-out',
      'ease-out',
      'linear',
      'step-end',
      'step-start',
    ]);
    assert.deepStrictEqual(easing.functions, [
      'cubic-bezier',
      'linear',
      'steps',
    ]);
  });
});

suite('validateShorthandIdentities', () => {
  test('accepts independently built Webref-shaped data', () => {
    assert.doesNotThrow(() =>
      validateShorthandIdentities(buildShorthandIdentities(webref()))
    );
  });

  test('rejects alignment data that loses auto from place-self', () => {
    const data = buildShorthandIdentities(webref());
    data.alignment.set(
      'place-self',
      data.alignment.get('place-self').filter((form) => form !== 'auto')
    );
    assert.throws(
      () => validateShorthandIdentities(data),
      /place-self forms to include auto/
    );
  });

  test('serializes maps as internal JSON objects', () => {
    const serialized = JSON.parse(
      serializeShorthandIdentities(buildShorthandIdentities(webref()))
    );
    assert.ok(serialized.alignment['place-self'].includes('auto'));
    assert.deepStrictEqual(serialized.easing.functions, [
      'cubic-bezier',
      'linear',
      'steps',
    ]);
  });
});
