import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProperties,
  buildPropertyGroups,
  serializeProperties,
  validate,
  validateProperties,
} from '../lib/webrefProperties.js';

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
    /Cyclic shorthand definition/v
  );
});

/**
 * `validate` gates on the size of the extract before anything else, so a
 * fixture aimed at a later check has to clear that bar first.
 *
 * @param {import('../lib/webrefProperties.js').WebrefProperty[]} properties
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
  assert.throws(
    () => validate(data),
    /Logical property group margin is split/v
  );
});

test('validate rejects data that lost the relations the plugin needs', () => {
  assert.throws(
    () => validate(buildPropertyGroups([{ name: 'color' }])),
    /Expected at least 500 properties/v
  );
});

test('buildProperties keys each name to an alias, its written longhands, or a longhand', () => {
  const entries = buildProperties([
    { name: 'mask', longhands: ['-webkit-mask-image'] },
    { name: '-webkit-mask-image', legacyAliasOf: 'mask-image' },
    { name: 'mask-image' },
  ]);
  assert.deepStrictEqual(entries, {
    mask: { writes: ['mask-image'] },
    'mask-image': {},
    '-webkit-mask-image': { aliasOf: 'mask-image' },
  });
});

test('buildProperties lists the transitive longhands and resets of a shorthand, sorted', () => {
  const entries = buildProperties([
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
  assert.deepStrictEqual(entries.border.writes, [
    'border-image-source',
    'border-left-width',
    'border-top-width',
  ]);
});

test('buildProperties gives a logical longhand its group and side', () => {
  const entries = buildProperties([
    { name: 'margin-top', logicalPropertyGroup: 'margin' },
    { name: 'margin-inline-start', logicalPropertyGroup: 'margin' },
    { name: 'color' },
  ]);
  assert.deepStrictEqual(entries['margin-top'], {
    group: 'margin',
    side: 'physical',
  });
  assert.deepStrictEqual(entries['margin-inline-start'], {
    group: 'margin',
    side: 'flow-relative',
  });
  assert.deepStrictEqual(entries.color, {});
});

test('validateProperties rejects an alias to a name the table does not list', () => {
  assert.throws(
    () => validateProperties({ '-webkit-x': { aliasOf: 'x' } }, emptyFamily()),
    /aliases unknown property x/v
  );
});

test('validateProperties rejects a shorthand that writes a name the table does not list', () => {
  assert.throws(
    () =>
      validateProperties({ mask: { writes: ['mask-image'] } }, emptyFamily()),
    /writes unknown property mask-image/v
  );
});

test('validateProperties rejects a family longhand that the shorthand does not write', () => {
  const entries = {
    font: { writes: ['font-weight'] },
    'font-weight': {},
    'line-height': {},
  };
  assert.throws(
    () =>
      validateProperties(entries, {
        shorthands: ['font'],
        setsLonghands: () => new Set(['font-weight', 'line-height']),
      }),
    /font sets line-height in the family tables but not in writes/v
  );
});

test('validateProperties accepts a family reset that expands to longhands the shorthand writes', () => {
  const entries = {
    border: { writes: ['border-image-source', 'border-top-width'] },
    'border-image': { writes: ['border-image-source'] },
    'border-image-source': {},
    'border-top-width': {},
  };
  assert.doesNotThrow(() =>
    validateProperties(entries, {
      shorthands: ['border'],
      setsLonghands: () => new Set(['border-image', 'border-top-width']),
    })
  );
});

test('serializeProperties writes a newline-terminated JSON object keyed by properties', () => {
  const text = serializeProperties({ color: {} });
  assert.strictEqual(text, '{\n  "properties": {\n    "color": {}\n  }\n}\n');
});

/** @return {{ shorthands: string[], setsLonghands: () => Set<string> }} */
function emptyFamily() {
  return { shorthands: [], setsLonghands: () => new Set() };
}
