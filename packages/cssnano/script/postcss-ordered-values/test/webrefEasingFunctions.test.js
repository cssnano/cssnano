import { test } from 'node:test';
import assert from 'node:assert';
import {
  buildEasingFunctions,
  serialize,
  validate,
} from '../lib/webrefEasingFunctions.js';

const types = [
  {
    name: 'easing-function',
    syntax:
      '<linear-easing-function> | <cubic-bezier-easing-function> | <step-easing-function>',
  },
  { name: 'linear-easing-function', syntax: 'linear | <linear()>' },
  {
    name: 'cubic-bezier-easing-function',
    syntax: 'ease | ease-in | ease-out | ease-in-out | <cubic-bezier()>',
  },
  {
    name: 'step-easing-function',
    syntax: 'step-start | step-end | <steps()>',
  },
];

test('buildEasingFunctions follows type references', () => {
  assert.deepStrictEqual(buildEasingFunctions({ properties: [], types }), {
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
  });
});

test('buildEasingFunctions requires all referenced types', () => {
  assert.throws(
    () =>
      buildEasingFunctions({
        properties: [],
        types: [{ name: 'easing-function', syntax: '<missing>' }],
      }),
    /does not define <missing>/v
  );
});

test('validate requires essential easing terminals', () => {
  const data = buildEasingFunctions({ properties: [], types });
  assert.doesNotThrow(() => validate(data));
  assert.throws(
    () => validate({ ...data, functions: ['cubic-bezier', 'steps'] }),
    /Unexpected easing functions/v
  );
});

test('serialize produces generated JSON', () => {
  assert.deepStrictEqual(
    JSON.parse(serialize(buildEasingFunctions({ properties: [], types }))),
    {
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
    }
  );
});
