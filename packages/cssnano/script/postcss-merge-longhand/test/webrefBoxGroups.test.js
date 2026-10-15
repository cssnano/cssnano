import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildLonghands, validate } from '../lib/webrefLonghands.js';
import { webref } from './webrefFixture.js';

const boxGroupNames = [
  'margin',
  'padding',
  'inset',
  'scroll-margin',
  'scroll-padding',
];

describe('buildLonghands box groups', () => {
  const { shorthands, boxGroups } = buildLonghands(webref());

  test('lists the five groups of box properties', () => {
    assert.deepStrictEqual(
      [...boxGroups.keys()].toSorted(),
      boxGroupNames.toSorted()
    );
  });

  test('has each physical shorthand set only the four physical sides', () => {
    for (const name of boxGroupNames) {
      const prefix = name === 'inset' ? '' : `${name}-`;
      assert.deepStrictEqual(
        shorthands.get(name)?.longhands,
        ['top', 'right', 'bottom', 'left'].map((side) => `${prefix}${side}`),
        name
      );
    }
  });

  test('has each axis shorthand set its start and end longhands', () => {
    for (const [name, { axisShorthands }] of boxGroups) {
      assert.deepStrictEqual(
        axisShorthands,
        [`${name}-block`, `${name}-inline`],
        name
      );
      for (const axis of axisShorthands) {
        assert.deepStrictEqual(
          shorthands.get(axis)?.longhands,
          [`${axis}-start`, `${axis}-end`],
          axis
        );
      }
    }
  });

  test('keeps flow-relative longhands out of every physical shorthand because they are aliases, not members', () => {
    for (const name of boxGroupNames) {
      const { longhands, resets } = shorthands.get(name);
      assert.deepStrictEqual(
        [...longhands, ...resets].filter((property) =>
          /-(?:block|inline)(?:-|$)/v.test(property)
        ),
        [],
        name
      );
    }
  });

  test('gives every axis longhand an initial value to fill in', () => {
    const { initialValues } = buildLonghands(webref());
    assert.strictEqual(initialValues.get('margin-block-start'), '0');
    assert.strictEqual(initialValues.get('inset-inline-end'), 'auto');
    assert.strictEqual(initialValues.get('scroll-padding-block-end'), 'auto');
  });

  test('derives margin values as lengths, percentages and auto, negative allowed', () => {
    assert.deepStrictEqual(boxGroups.get('margin')?.grammar, {
      auto: true,
      percentage: true,
      negative: true,
    });
  });

  test('derives padding values as non-negative lengths and percentages without auto', () => {
    assert.deepStrictEqual(boxGroups.get('padding')?.grammar, {
      auto: false,
      percentage: true,
      negative: false,
    });
  });

  test('derives inset values as margin values, ignoring anchor functions', () => {
    assert.deepStrictEqual(boxGroups.get('inset')?.grammar, {
      auto: true,
      percentage: true,
      negative: true,
    });
  });

  test('derives scroll-margin values as lengths only, negative allowed', () => {
    assert.deepStrictEqual(boxGroups.get('scroll-margin')?.grammar, {
      auto: false,
      percentage: false,
      negative: true,
    });
  });

  test('derives scroll-padding values as auto or non-negative lengths and percentages', () => {
    assert.deepStrictEqual(boxGroups.get('scroll-padding')?.grammar, {
      auto: true,
      percentage: true,
      negative: false,
    });
  });
});

describe('buildLonghands box grammar', () => {
  test('rejects webref data that gives a box longhand no grammar', () => {
    const data = webref();
    data.properties = data.properties.filter(
      (property) => property.name !== 'scroll-margin-top'
    );
    assert.throws(() => buildLonghands(data), /no grammar/v);
  });
});

describe('validate box groups', () => {
  test('rejects a physical shorthand that resets a flow-relative longhand', () => {
    const data = buildLonghands(webref());
    data.shorthands.get('padding').resets.push('padding-inline-start');
    assert.throws(
      () => validate(data),
      /Expected padding not to set padding-inline-start/v
    );
  });

  test('rejects a physical shorthand that took in a flow-relative longhand', () => {
    const data = buildLonghands(webref());
    data.shorthands.get('margin').longhands.push('margin-block-start');
    assert.throws(() => validate(data), /margin/v);
  });

  test('rejects an axis shorthand that stopped setting its start and end', () => {
    const data = buildLonghands(webref());
    data.shorthands.get('inset-block').longhands.pop();
    assert.throws(() => validate(data), /inset-block/v);
  });
});
