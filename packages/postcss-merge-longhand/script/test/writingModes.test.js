import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import committed from '../../src/data/flowRelativeSides.json' with { type: 'json' };
import {
  buildFlowRelativeSides,
  serializeFlowRelativeSides,
} from '../lib/writingModes.js';

const sides = ['top', 'right', 'bottom', 'left'];
const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
const horizontal = new Set(['left', 'right']);

const { modes, possibleSides } = buildFlowRelativeSides();

describe('flow-relative side mapping', () => {
  test('covers every combination of the five writing modes and both directions', () => {
    assert.deepEqual(
      modes.map((mode) => `${mode.writingMode} ${mode.direction}`).toSorted(),
      [
        'horizontal-tb ltr',
        'horizontal-tb rtl',
        'sideways-lr ltr',
        'sideways-lr rtl',
        'sideways-rl ltr',
        'sideways-rl rtl',
        'vertical-lr ltr',
        'vertical-lr rtl',
        'vertical-rl ltr',
        'vertical-rl rtl',
      ]
    );
  });

  test('maps the four flow-relative longhands onto the four sides one to one in each mode', () => {
    for (const mode of modes) {
      assert.deepEqual(Object.values(mode.sides).toSorted(), sides.toSorted());
    }
  });

  test('puts the start and the end of an axis on opposite sides in each mode', () => {
    for (const { sides: mapping } of modes) {
      assert.equal(opposite[mapping['block-start']], mapping['block-end']);
      assert.equal(opposite[mapping['inline-start']], mapping['inline-end']);
    }
  });

  test('puts the block and inline axes on perpendicular sides in each mode', () => {
    for (const { sides: mapping } of modes) {
      assert.notEqual(
        horizontal.has(mapping['block-start']),
        horizontal.has(mapping['inline-start'])
      );
    }
  });

  test('reverses the inline axis when the direction flips and leaves the block axis alone', () => {
    for (const mode of modes.filter(({ direction }) => direction === 'ltr')) {
      const flipped = modes.find(
        (other) =>
          other.writingMode === mode.writingMode && other.direction === 'rtl'
      );
      assert.equal(flipped.sides['inline-start'], mode.sides['inline-end']);
      assert.equal(flipped.sides['block-start'], mode.sides['block-start']);
    }
  });

  test('lays out horizontal text left to right and top to bottom by default', () => {
    const mode = modes.find(
      ({ writingMode, direction }) =>
        writingMode === 'horizontal-tb' && direction === 'ltr'
    );
    assert.deepEqual(mode.sides, {
      'block-start': 'top',
      'block-end': 'bottom',
      'inline-start': 'left',
      'inline-end': 'right',
    });
  });

  test('reports as possible exactly the sides some mode maps the longhand to', () => {
    for (const [longhand, possible] of Object.entries(possibleSides)) {
      assert.deepEqual(
        possible,
        [...new Set(modes.map((mode) => mode.sides[longhand]))].toSorted()
      );
    }
  });

  test('never maps block-start to bottom or block-end to top', () => {
    assert.ok(!possibleSides['block-start'].includes('bottom'));
    assert.ok(!possibleSides['block-end'].includes('top'));
  });

  test('lets an inline longhand land on any side', () => {
    assert.deepEqual(possibleSides['inline-start'], sides.toSorted());
    assert.deepEqual(possibleSides['inline-end'], sides.toSorted());
  });
});

describe('committed flow-relative side data', () => {
  test('holds only the modes, which are all the plugin reads', () => {
    assert.deepEqual(Object.keys(committed), ['modes']);
  });

  test('matches what the generator derives, so it is never edited by hand', () => {
    assert.deepEqual(
      committed,
      JSON.parse(serializeFlowRelativeSides(buildFlowRelativeSides()))
    );
  });
});
