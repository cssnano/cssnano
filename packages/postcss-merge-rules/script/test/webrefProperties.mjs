import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPropertyGroups,
  isFlowRelative,
  validate,
} from '../lib/webrefProperties.mjs';

for (const [name, expected] of [
  ['margin-inline-start', true],
  ['margin-top', false],
  ['inline-size', true],
  ['width', false],
  ['border-start-start-radius', true],
  ['border-top-left-radius', false],
  // `inline` and `block` only count as whole segments
  ['baseline-source', false],
]) {
  test(`isFlowRelative(${name}) is ${expected}`, () => {
    assert.strictEqual(isFlowRelative(name), expected);
  });
}

test('expands shorthands transitively', () => {
  const { shorthands } = buildPropertyGroups([
    {
      name: 'border',
      longhands: ['border-width'],
      resetLonghands: ['border-image'],
    },
    {
      name: 'border-width',
      longhands: ['border-top-width', 'border-left-width'],
    },
    { name: 'border-top-width' },
    { name: 'border-left-width' },
    { name: 'border-image', longhands: ['border-image-source'] },
    { name: 'border-image-source' },
  ]);
  assert.deepStrictEqual(shorthands.get('border'), [
    'border-image-source',
    'border-left-width',
    'border-top-width',
  ]);
  assert.strictEqual(shorthands.has('border-top-width'), false);
});

test('resolves longhands through legacy aliases', () => {
  const { shorthands, aliases } = buildPropertyGroups([
    { name: 'mask', longhands: ['-webkit-mask-image'] },
    { name: '-webkit-mask-image', legacyAliasOf: 'mask-image' },
    { name: 'mask-image' },
  ]);
  assert.deepStrictEqual(shorthands.get('mask'), ['mask-image']);
  assert.strictEqual(aliases.get('-webkit-mask-image'), 'mask-image');
  // An alias is not a shorthand for the property it aliases.
  assert.strictEqual(shorthands.has('-webkit-mask-image'), false);
});

test('splits logical property groups into physical and flow-relative', () => {
  const { logicalGroups, flowRelative } = buildPropertyGroups([
    { name: 'margin-top', logicalPropertyGroup: 'margin' },
    { name: 'margin-inline-start', logicalPropertyGroup: 'margin' },
    { name: 'color' },
  ]);
  assert.strictEqual(logicalGroups.get('margin-top'), 'margin');
  assert.strictEqual(logicalGroups.has('color'), false);
  assert.deepStrictEqual(flowRelative, ['margin-inline-start']);
});

test('drops the custom property placeholder', () => {
  const { properties } = buildPropertyGroups([
    { name: '--*' },
    { name: 'color' },
  ]);
  assert.deepStrictEqual(properties, ['color']);
});

test('rejects cyclic shorthand definitions', () => {
  assert.throws(
    () =>
      buildPropertyGroups([
        { name: 'a', longhands: ['b'] },
        { name: 'b', longhands: ['a'] },
      ]),
    /Cyclic shorthand definition/
  );
});

/**
 * `validate` gates on the size of the extract before anything else, so a
 * fixture aimed at a later check has to clear that bar first.
 *
 * @param {import('../lib/webrefProperties.mjs').WebrefProperty[]} properties
 */
function padded(properties) {
  return [
    ...properties,
    ...Array.from({ length: 500 }, (_, index) => ({ name: `filler-${index}` })),
  ];
}

test('validate rejects a lopsided logical property group', () => {
  const data = buildPropertyGroups(
    padded([
      { name: 'margin-top', logicalPropertyGroup: 'margin' },
      { name: 'margin-bottom', logicalPropertyGroup: 'margin' },
    ])
  );
  assert.throws(() => validate(data), /Logical property group margin is split/);
});

test('validate rejects data that lost the relations the plugin needs', () => {
  assert.throws(
    () => validate(buildPropertyGroups([{ name: 'color' }])),
    /Expected at least 500 properties/
  );
});
