import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import flowRelativeSides from '../src/data/flowRelativeSides.json' with { type: 'json' };
import {
  aliasedGroup,
  boxGroups,
  boxProperties,
  writingModes,
} from '../src/lib/decl/boxGroups.js';

const everyCell = Array.from(
  { length: writingModes.length * 4 },
  (_, cell) => cell
);

/**
 * @param {string} name
 * @return {number[]}
 */
function cellsOf(name) {
  return /** @type {{ cells: number[] }} */ (boxProperties.get(name)).cells;
}

const nameOf = (/** @type {string} */ prop) => aliasedGroup(prop)?.name;

describe('box group cells', () => {
  test('lets a physical shorthand set every side in every writing mode', () => {
    for (const { physical } of boxGroups) {
      assert.deepEqual(
        cellsOf(physical.shorthand).toSorted((a, b) => a - b),
        everyCell
      );
    }
  });

  test('lets the physical longhands together set what their shorthand sets', () => {
    for (const { physical } of boxGroups) {
      assert.deepEqual(
        physical.longhands.flatMap(cellsOf).toSorted((a, b) => a - b),
        cellsOf(physical.shorthand).toSorted((a, b) => a - b)
      );
    }
  });

  test('lets the two axes together set every side in every writing mode and neither set the other’s', () => {
    for (const { flow, name } of boxGroups) {
      const [block, inline] = flow.map(({ shorthand }) => cellsOf(shorthand));
      assert.deepEqual(
        [...block, ...inline].toSorted((a, b) => a - b),
        everyCell,
        name
      );
    }
  });

  test('gives the start and the end of an axis different sides in every writing mode', () => {
    for (const { flow } of boxGroups) {
      for (const { longhands } of flow) {
        const [start, end] = longhands.map(cellsOf);
        assert.deepEqual(
          start.filter((cell) => end.includes(cell)),
          []
        );
      }
    }
  });

  test('sets one side per writing mode for a longhand', () => {
    for (const { name } of boxGroups) {
      assert.equal(cellsOf(`${name}-block-start`).length, writingModes.length);
    }
  });
});

/**
 * @param {{ sides: Record<string, string> }} mode
 * @return {string} the physical sides of the flow-relative suffixes, in a fixed order
 */
function mappingOf({ sides }) {
  return Object.keys(sides)
    .toSorted()
    .map((suffix) => sides[suffix])
    .join();
}

describe('box writing modes', () => {
  test('keeps a mode for every distinct mapping of the flow-relative suffixes', () => {
    assert.deepEqual(
      new Set(writingModes.map(mappingOf)),
      new Set(flowRelativeSides.modes.map(mappingOf))
    );
  });

  test('keeps one mode for each mapping, as modes that map alike set the same sides', () => {
    assert.equal(
      new Set(writingModes.map(mappingOf)).size,
      writingModes.length
    );
  });
});

describe('aliasedGroup', () => {
  test('names the group of a legacy or unknown property that shares a name', () => {
    assert.equal(nameOf('scroll-snap-margin-top'), 'scroll-margin');
    assert.equal(nameOf('margin-trim'), 'margin');
    assert.equal(nameOf('inset-area'), 'inset');
    assert.equal(nameOf('offset-block-start'), 'inset');
  });

  test('names the group of a vendor-prefixed alias', () => {
    assert.equal(nameOf('-webkit-margin-start'), 'margin');
    assert.equal(nameOf('-moz-padding-end'), 'padding');
  });

  test('names no group for an unrelated property', () => {
    assert.equal(nameOf('color'), undefined);
    assert.equal(nameOf('offset-path'), undefined);
    assert.equal(nameOf('-webkit-transition'), undefined);
    assert.equal(nameOf('-webkit-box-shadow'), undefined);
  });

  test('names no group for a custom property or a lone hyphen name', () => {
    assert.equal(nameOf('--margin-top'), undefined);
    assert.equal(nameOf('-margin'), undefined);
  });
});
