import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildColorProperties,
  directReferences,
  serialize,
  validate,
} from '../lib/webrefColors.mjs';

test('directReferences extracts property and type references', () => {
  assert.deepStrictEqual(
    directReferences("<'border-color'> || <color> || <linear-gradient()>"),
    ["'border-color'", 'color', 'linear-gradient()']
  );
});

test('buildColorProperties stops traversal at function productions', () => {
  const data = buildColorProperties({
    properties: [
      { name: 'color', syntax: '<color>' },
      { name: 'border-color', syntax: "<'color'>" },
      { name: 'background-image', syntax: '<image>' },
      { name: 'list-style-type', syntax: '<counter-style-name>' },
      { name: 'content', syntax: 'normal | <content-list>' },
      { name: 'shape-outside', syntax: 'none | <shape-box> | <image>' },
      { name: 'filter', syntax: 'none | <filter-function-list>' },
      { name: 'animation-name', syntax: 'none | <custom-ident>' },
      { name: '--custom-color', syntax: '<color>' },
      { name: '-webkit-color', syntax: '<color>' },
      { name: '-webkit-text-fill-color', syntax: '<color>' },
      { name: 'legacy-color', syntax: '<color>', legacyAliasOf: 'color' },
    ],
    types: [
      { name: 'image', syntax: '<gradient> | <image-function()>' },
      { name: 'gradient', syntax: '<linear-gradient()>' },
      { name: 'content-list', syntax: '<image>' },
      { name: 'filter-function-list', syntax: '<drop-shadow()>' },
      { name: 'counter-style-name', syntax: '<custom-ident>' },
    ],
    functions: [
      {
        name: 'linear-gradient()',
        syntax: 'linear-gradient( [ <color> ]# )',
      },
    ],
  });

  assert.deepStrictEqual(
    data,
    [
      '-webkit-text-fill-color',
      '-webkit-color',
      'background-image',
      'border-image',
      'border-image-source',
      'fill',
      'stroke',
      'border-color',
      'color',
      'tap-highlight-color',
      '-webkit-text-stroke-color',
    ].toSorted()
  );
});

test('validate passes on valid dataset meeting shape invariants', () => {
  const coreProps = [
    'background',
    'border',
    'outline',
    'column-rule',
    'text-decoration',
    'text-emphasis',
    'box-shadow',
    'text-shadow',
    'caret',
    'accent-color',
    'scrollbar-color',
    'background-image',
    'border-image',
    'border-image-source',
    'fill',
    'stroke',
    '-webkit-text-fill-color',
    '-webkit-text-stroke-color',
    'tap-highlight-color',
  ];
  // Pad with dummy color properties to reach count >= 57
  const validData = [...coreProps];
  for (let i = validData.length; i < 57; i++) {
    validData.push(`color-prop-${i}`);
  }

  assert.doesNotThrow(() => validate(validData));
});

test('validate rejects datasets below the count invariant', () => {
  assert.throws(
    () => validate(['color', 'background']),
    /Expected at least 57 color properties/v
  );
});

test('validate rejects datasets missing essential spot-checked properties', () => {
  const dummyProps = [];
  for (let i = 0; i < 75; i++) {
    dummyProps.push(`prop-${i}`);
  }
  assert.throws(
    () => validate(dummyProps),
    /Expected color properties to include background/v
  );
});

test('validate rejects datasets containing forbidden custom-ident properties', () => {
  const coreProps = [
    'background',
    'border',
    'outline',
    'column-rule',
    'text-decoration',
    'text-emphasis',
    'box-shadow',
    'text-shadow',
    'caret',
    'accent-color',
    'scrollbar-color',
    'background-image',
    'border-image',
    'border-image-source',
    'fill',
    'stroke',
    '-webkit-text-fill-color',
    '-webkit-text-stroke-color',
    'tap-highlight-color',
    'animation-name',
  ];
  for (let i = coreProps.length; i < 72; i++) {
    coreProps.push(`color-prop-${i}`);
  }
  assert.throws(
    () => validate(coreProps),
    /Expected color properties not to include animation-name/v
  );
});

test('serialize formats as JSON with trailing newline', () => {
  assert.strictEqual(serialize(['color']), '[\n  "color"\n]\n');
});
