import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import committed from '../../src/data/shorthandIdentities.json' with { type: 'json' };
import {
  buildShorthandIdentities,
  serializeShorthandIdentities,
  validateShorthandIdentities,
} from '../lib/webrefShorthandIdentities.js';

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
          'normal | stretch | <baseline-position> | <overflow-position>? [ <self-position> | left | right ] | legacy | legacy && [ left | right | center ]',
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

describe('buildShorthandIdentities', () => {
  test('derives accepted forms for each alignment shorthand', () => {
    const data = buildShorthandIdentities(webref());
    assert.ok(data.alignment.get('place-content')?.includes('space-between'));
    assert.ok(data.alignment.get('place-items')?.includes('first baseline'));
    assert.ok(data.alignment.get('place-self')?.includes('auto'));
    assert.ok(!data.alignment.get('place-content')?.includes('baseline'));
    assert.ok(!data.alignment.get('place-items')?.includes('auto'));
  });

  test('derives each alignment longhand with first|last baseline as the only order', () => {
    const { alignmentLonghands } = buildShorthandIdentities(webref());
    const forms = alignmentLonghands.get('align-items');
    assert.ok(forms.includes('last baseline'));
    assert.ok(!forms.includes('baseline last'));
  });

  test('derives justify-self keywords that the place-self shorthand cannot share', () => {
    const { alignmentLonghands } = buildShorthandIdentities(webref());
    assert.ok(alignmentLonghands.get('justify-self').includes('safe left'));
    assert.ok(!alignmentLonghands.get('align-self').includes('safe left'));
  });

  test('derives legacy && [ left | right | center ] in both orders, for justify-items only', () => {
    const { alignmentLonghands } = buildShorthandIdentities(webref());
    const legacyForms = (name) =>
      new Set(
        alignmentLonghands
          .get(name)
          .filter((form) => form.split(' ').includes('legacy'))
      );
    assert.deepStrictEqual(
      legacyForms('justify-items'),
      new Set([
        'legacy',
        ...['left', 'right', 'center'].flatMap((position) => [
          `legacy ${position}`,
          `${position} legacy`,
        ]),
      ])
    );
    for (const name of alignmentLonghands.keys()) {
      if (name !== 'justify-items') assert.equal(legacyForms(name).size, 0);
    }
  });

  test('commits each place-* form list as the forms both of its longhands accept', () => {
    for (const [shorthand, forms] of Object.entries(committed.alignment)) {
      const axis = shorthand.slice('place-'.length);
      const justify = new Set(committed.alignmentLonghands[`justify-${axis}`]);
      assert.deepStrictEqual(
        new Set(forms),
        new Set(committed.alignmentLonghands[`align-${axis}`]).intersection(
          justify
        )
      );
    }
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

  test("resolves a <'name'> reference to the property rather than to a type of the same name", () => {
    const data = webref();
    data.properties.push({ name: 'shared-name', syntax: 'ease' });
    data.types.push({ name: 'shared-name', syntax: 'step-end' });
    data.types.find(({ name }) => name === 'easing-function').syntax =
      "<'shared-name'>";
    assert.deepStrictEqual(buildShorthandIdentities(data).easing.keywords, [
      'ease',
    ]);
  });

  test('pools the alternatives of a type that several specs define', () => {
    const data = webref();
    data.types.push({ name: 'step-easing-function', syntax: 'step-middle' });
    const { keywords } = buildShorthandIdentities(data).easing;
    assert.deepStrictEqual(
      keywords.filter((keyword) => keyword.startsWith('step-')),
      ['step-end', 'step-middle', 'step-start']
    );
  });
});

describe('validateShorthandIdentities', () => {
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
      /place-self forms to include auto/v
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
