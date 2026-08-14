import { test, suite } from 'node:test';
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
 * columns families.
 *
 * @param {Partial<Parameters<typeof buildLonghands>[0]>} [overrides]
 */
function webref(overrides = {}) {
  /** @type {Parameters<typeof buildLonghands>[0]['properties']} */
  const properties = [
    {
      name: 'all',
      /* `revert-rule` is a css-cascade draft no engine implements. */
      syntax: 'initial | inherit | unset | revert | revert-layer | revert-rule',
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
      {
        name: 'color-base',
        syntax: '<color-function> | <color-mix()> | <light-dark-color>',
      },
      { name: 'light-dark-color', syntax: 'light-dark(<color>, <color>)' },
      {
        name: 'color-function',
        syntax:
          '<rgb()> | <rgba()> | <hsl()> | <hsla()> | <hwb()> | <lab()> | <lch()> | <oklab()> | <oklch()> | <color()> | <hdr-color()> | <alpha()>',
      },
      /* Listed among the colour functions, though what it specifies is the
       * alpha of a colour rather than a colour, as css-color-hdr writes it. */
      { name: 'alpha()', syntax: 'alpha( [from <color>]? )' },
    ],
    functions: [
      { name: 'color-mix()', syntax: 'color-mix( <color># )' },
      /* Named one thing and called another, as css-color-hdr writes it. */
      { name: 'hdr-color()', syntax: 'color-hdr( <color># )' },
    ],
    ...overrides,
  };
}

suite('keywordTerminals', () => {
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
});

suite('reachableFunctions', () => {
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

  test('reaches a function spelled out as a call rather than named as a type', () => {
    const data = {
      properties: [],
      types: [
        { name: 'paint', syntax: '<colour> | none' },
        { name: 'colour', syntax: '<rgb()> | <pale-colour>' },
        { name: 'pale-colour', syntax: 'pale( <colour> )' },
      ],
      functions: [{ name: 'rgb()', syntax: 'rgb( <number>{3} )' }],
    };

    assert.deepStrictEqual(reachableFunctions(data, 'paint'), ['pale', 'rgb']);
  });

  test('reaches a function under the name its own syntax calls it by', () => {
    const data = {
      properties: [],
      types: [
        { name: 'paint', syntax: '<colour> | none' },
        { name: 'colour', syntax: '<hdr-colour()>' },
        { name: 'hdr-colour()', syntax: 'colour-hdr( <number># )' },
      ],
      functions: [],
    };

    assert.deepStrictEqual(reachableFunctions(data, 'paint'), [
      'colour-hdr',
      'hdr-colour',
    ]);
  });

  test('does not follow a function into what its arguments can name', () => {
    const data = {
      properties: [],
      types: [
        { name: 'paint', syntax: '<colour> | none' },
        { name: 'colour', syntax: '<rgb()> | <contrast()>' },
        { name: 'contrast()', syntax: 'contrast( <colour> , <target> )' },
        { name: 'target', syntax: '<ratio()> | aa' },
        { name: 'ratio()', syntax: 'ratio( <number> )' },
      ],
      functions: [{ name: 'rgb()', syntax: 'rgb( <number>{3} )' }],
    };

    assert.deepStrictEqual(reachableFunctions(data, 'paint'), [
      'contrast',
      'rgb',
    ]);
  });

  test('stops at a production a spec only defines in prose', () => {
    const data = {
      properties: [],
      types: [{ name: 'paint', syntax: '<length> | <rgb()>' }],
      functions: [],
    };

    assert.deepStrictEqual(reachableFunctions(data, 'paint'), ['rgb']);
  });
});

suite('isFlowRelative', () => {
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
});

suite('buildLonghands', () => {
  test('leaves out a line width keyword no browser implements', () => {
    const data = buildLonghands(webref());

    assert.deepStrictEqual(data.lineWidthKeywords, ['thin', 'medium', 'thick']);
  });

  test('leaves out a CSS-wide keyword no browser implements', () => {
    const data = buildLonghands(webref());

    assert.deepStrictEqual(data.cssWideKeywords, [
      'initial',
      'inherit',
      'unset',
      'revert',
      'revert-layer',
    ]);
  });

  test('leaves out a function that specifies an alpha rather than a colour', () => {
    const data = buildLonghands(webref());

    assert.ok(!data.colorFunctions.includes('alpha'));
  });

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

    assert.deepStrictEqual(shorthands.get('border')?.resets.toSorted(), [
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
});

suite('validate', () => {
  test('rejects data that took back a keyword no browser implements', () => {
    const data = buildLonghands(webref());
    data.lineWidthKeywords = ['hairline', ...data.lineWidthKeywords];

    assert.throws(() => validate(data), /exclude hairline/);
  });

  test('rejects colour data that took in a function naming no colour', () => {
    const data = buildLonghands(webref());
    data.colorFunctions = [...data.colorFunctions, 'wcag2'];

    assert.throws(() => validate(data), /exclude wcag2/);
  });

  test('rejects colour data that lost a function spelled out as a call', () => {
    const data = buildLonghands(webref());
    data.colorFunctions = data.colorFunctions.filter(
      (name) => name !== 'light-dark'
    );

    assert.throws(() => validate(data), /include light-dark/);
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
});
