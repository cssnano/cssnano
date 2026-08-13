import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLonghands,
  isFlowRelative,
  keywordTerminals,
  reachableFunctions,
  validate,
} from '../lib/webrefLonghands.mjs';

/**
 * A webref shaped stand-in holding just enough of the border, margin and
 * columns families to build the data from.
 *
 * @param {Partial<Parameters<typeof buildLonghands>[0]>} [overrides]
 */
function webref(overrides = {}) {
  /** @type {Parameters<typeof buildLonghands>[0]['properties']} */
  const properties = [
    {
      name: 'all',
      syntax: 'initial | inherit | unset | revert | revert-layer',
    },
    {
      name: 'border',
      longhands: ['border-width', 'border-style', 'border-color'],
      resetLonghands: ['border-image'],
      initial: 'see individual properties',
    },
    { name: 'border-image', longhands: ['border-image-source'] },
    { name: 'border-image-source', initial: 'none' },
  ];

  for (const component of ['width', 'style', 'color']) {
    properties.push({
      name: `border-${component}`,
      longhands: ['top', 'right', 'bottom', 'left'].map(
        (side) => `border-${side}-${component}`
      ),
      initial: 'see individual properties',
    });
  }

  for (const side of ['top', 'right', 'bottom', 'left']) {
    properties.push({
      name: `border-${side}`,
      longhands: ['width', 'style', 'color'].map(
        (component) => `border-${side}-${component}`
      ),
    });

    for (const [component, initial] of [
      ['width', 'medium'],
      ['style', 'none'],
      ['color', 'currentcolor'],
    ]) {
      properties.push({
        name: `border-${side}-${component}`,
        initial,
        logicalPropertyGroup: `border-${component}`,
      });
    }

    properties.push({
      name: `border-${side}-radius`,
      initial: '0',
      logicalPropertyGroup: 'border-radius',
    });
  }

  for (const name of ['margin', 'padding']) {
    properties.push({
      name,
      longhands: ['top', 'right', 'bottom', 'left'].map(
        (side) => `${name}-${side}`
      ),
      initial: '0',
    });

    for (const side of ['top', 'right', 'bottom', 'left']) {
      properties.push({ name: `${name}-${side}`, initial: '0' });
    }
  }

  properties.push(
    {
      name: 'columns',
      longhands: ['column-width', 'column-count', 'column-height'],
    },
    { name: 'column-width', initial: 'auto' },
    { name: 'column-count', initial: 'auto' },
    { name: 'column-height', initial: 'auto' },
    {
      name: 'border-inline-start-width',
      initial: 'medium',
      logicalPropertyGroup: 'border-width',
    },
    {
      name: 'border-start-start-radius',
      initial: '0',
      logicalPropertyGroup: 'border-radius',
    }
  );

  return {
    properties,
    types: [
      { name: 'line-style', syntax: 'none | hidden | dotted | dashed | solid' },
      {
        name: 'line-width',
        syntax: '<length [0,∞]> | hairline | thin | medium | thick',
      },
      {
        name: 'named-color',
        /* The real list runs to about 150 names, which `validate` expects. */
        syntax: ['red', 'rebeccapurple', 'transparent']
          .concat(Array.from({ length: 140 }, (_, i) => `stand-in-colour-${i}`))
          .join(' | '),
      },
      { name: 'color', syntax: '<color-base> | currentColor' },
      { name: 'color-base', syntax: '<color-function> | <color-mix()>' },
      {
        name: 'color-function',
        syntax:
          '<rgb()> | <rgba()> | <hsl()> | <hsla()> | <hwb()> | <lab()> | <lch()> | <oklab()> | <oklch()> | <color()>',
      },
    ],
    functions: [{ name: 'color-mix()', syntax: 'color-mix( <color># )' }],
    ...overrides,
  };
}

test('reads the keywords a grammar offers as alternatives', () => {
  assert.deepStrictEqual(
    keywordTerminals('<length [0,∞]> | hairline | thin | medium | thick'),
    ['hairline', 'thin', 'medium', 'thick']
  );
});

test('does not read a function as a keyword', () => {
  assert.deepStrictEqual(keywordTerminals('auto | minmax( <length> )'), [
    'auto',
  ]);
});

test('has no keywords for a term defined in prose', () => {
  assert.deepStrictEqual(keywordTerminals(undefined), []);
});

test('follows a grammar to the functions it can reach', () => {
  const data = {
    properties: [],
    types: [
      { name: 'paint', syntax: '<colour> | none' },
      { name: 'colour', syntax: '<mix()> | <rgb()> | red' },
      { name: 'mix()', syntax: 'mix( <colour># )' },
    ],
    functions: [{ name: 'rgb()', syntax: 'rgb( <number>{3} )' }],
  };

  assert.deepStrictEqual(reachableFunctions(data, 'paint'), ['mix', 'rgb']);
});

test('stops at a production a spec only defines in prose', () => {
  const data = {
    properties: [],
    types: [{ name: 'paint', syntax: '<length> | <rgb()>' }],
    functions: [],
  };

  assert.deepStrictEqual(reachableFunctions(data, 'paint'), ['rgb']);
});

for (const [name, expected] of [
  ['border-inline-start-width', true],
  ['border-start-start-radius', true],
  ['border-left-width', false],
  ['border-top-left-radius', false],
]) {
  test(`isFlowRelative(${name}) is ${expected}`, () => {
    assert.strictEqual(isFlowRelative(name), expected);
  });
}

test('derives the sides and the border components from the grammar', () => {
  const data = buildLonghands(webref());

  assert.deepStrictEqual(data.sides, ['top', 'right', 'bottom', 'left']);
  assert.deepStrictEqual(data.borderComponents, ['width', 'style', 'color']);
});

test('keeps the longhands of a shorthand in the order it lists them', () => {
  const { shorthands } = buildLonghands(webref());

  assert.deepStrictEqual(shorthands.get('margin')?.longhands, [
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
  ]);
  assert.deepStrictEqual(shorthands.get('border-top')?.longhands, [
    'border-top-width',
    'border-top-style',
    'border-top-color',
  ]);
});

test('expands what a shorthand resets through its own longhands', () => {
  const { shorthands } = buildLonghands(webref());

  assert.deepStrictEqual(shorthands.get('border')?.resets.sort(), [
    'border-image',
    'border-image-source',
  ]);
});

test('reports every longhand of the columns shorthand', () => {
  const { shorthands } = buildLonghands(webref());

  assert.deepStrictEqual(shorthands.get('columns')?.longhands, [
    'column-width',
    'column-count',
    'column-height',
  ]);
});

test('takes the initial value of a shorthand from its longhands', () => {
  const { initialValues } = buildLonghands(webref());

  assert.strictEqual(initialValues.get('border-width'), 'medium');
  assert.strictEqual(initialValues.get('border-top-color'), 'currentcolor');
  assert.strictEqual(initialValues.get('margin-top'), '0');
});

test('separates the flow-relative border properties from the physical', () => {
  const data = buildLonghands(webref());

  assert.ok(
    data.flowRelativeBorderProperties.includes('border-inline-start-width')
  );
  assert.ok(!data.flowRelativeBorderProperties.includes('border-left-width'));
  assert.ok(data.borderProperties.includes('border-left-width'));
});

test('accepts data with the shape the plugin assumes', () => {
  assert.doesNotThrow(() => validate(buildLonghands(webref())));
});

test('rejects a border no longer crossing a side with a component', () => {
  const data = buildLonghands(webref());
  data.sides = ['top', 'right', 'bottom'];

  assert.throws(() => validate(data), /the sides/);
});

test('rejects a longhand left without an initial value', () => {
  const data = buildLonghands(webref());
  data.initialValues.delete('margin-top');

  assert.throws(() => validate(data), /No initial value for margin-top/);
});

test('rejects a columns shorthand that stops setting a width', () => {
  const data = buildLonghands(webref());
  data.shorthands.set('columns', {
    longhands: ['column-count'],
    resets: [],
  });

  assert.throws(() => validate(data), /Expected columns to set column-width/);
});
