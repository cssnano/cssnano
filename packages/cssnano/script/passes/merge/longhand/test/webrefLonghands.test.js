import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLonghands,
  keywordTerminals,
  reachableFunctions,
  validate,
} from '../lib/webrefLonghands.js';
import { webref } from './webrefFixture.js';

describe('keywordTerminals', () => {
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

describe('reachableFunctions', () => {
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

describe('buildLonghands', () => {
  test('leaves out a line width keyword no browser implements', () => {
    const data = buildLonghands(webref());

    assert.deepStrictEqual(data.lineWidthKeywords, ['thin', 'medium', 'thick']);
  });

  test('leaves out a CSS-wide keyword no browser implements', () => {
    const data = buildLonghands(webref());

    assert.deepStrictEqual(data.cssWideKeywords, [
      'inherit',
      'initial',
      'revert',
      'revert-layer',
      'unset',
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

  test('takes the initial value of column-width from css-multicol when css-sizing-4 redefines it without one', () => {
    const data = webref();
    const properties = data.properties.map((property) =>
      property.name === 'column-width'
        ? { name: 'column-width', syntax: 'auto | <box-size>' }
        : property
    );

    const { initialValues } = buildLonghands({ ...data, properties });

    assert.strictEqual(initialValues.get('column-width'), 'auto');
  });

  test('prefers the initial value webref specifies over the css-multicol fallback', () => {
    const data = webref();
    const properties = data.properties.map((property) =>
      property.name === 'column-width'
        ? { name: 'column-width', initial: 'fit-content' }
        : property
    );

    const { initialValues } = buildLonghands({ ...data, properties });

    assert.strictEqual(initialValues.get('column-width'), 'fit-content');
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

describe('validate', () => {
  test('rejects data that took back a keyword no browser implements', () => {
    const data = buildLonghands(webref());
    data.lineWidthKeywords = ['hairline', ...data.lineWidthKeywords];

    assert.throws(() => validate(data), /not to include hairline/v);
  });

  test('rejects colour data that took in a function naming no colour', () => {
    const data = buildLonghands(webref());
    data.colorFunctions = [...data.colorFunctions, 'wcag2'];

    assert.throws(() => validate(data), /not to include wcag2/v);
  });

  test('rejects colour data that lost a function spelled out as a call', () => {
    const data = buildLonghands(webref());
    data.colorFunctions = data.colorFunctions.filter(
      (name) => name !== 'light-dark'
    );

    assert.throws(() => validate(data), /include light-dark/v);
  });

  test('accepts data with the shape the plugin assumes', () => {
    assert.doesNotThrow(() => validate(buildLonghands(webref())));
  });

  test('rejects a border no longer crossing a side with a component', () => {
    const data = buildLonghands(webref());
    data.sides = ['top', 'right', 'bottom'];

    assert.throws(() => validate(data), /the sides/v);
  });

  test('rejects a longhand left without an initial value', () => {
    const data = buildLonghands(webref());
    data.initialValues.delete('margin-top');

    assert.throws(() => validate(data), /No initial value for margin-top/v);
  });

  test('rejects a columns shorthand that stops setting a width', () => {
    const data = buildLonghands(webref());
    data.shorthands.set('columns', {
      longhands: ['column-count'],
      resets: [],
    });

    assert.throws(
      () => validate(data),
      /Expected columns to set column-width/v
    );
  });
});
