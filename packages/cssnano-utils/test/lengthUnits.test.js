import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import cssnanoUtils from '../src/index.js';

/*
 * Independent specification oracle structured directly from W3C CSS Values 4 (§6)
 * and W3C CSS Containment 3 (§5.3).
 */
const W3C_ABSOLUTE_LENGTHS = ['cm', 'in', 'mm', 'pc', 'pt', 'px', 'q'];

const W3C_FONT_RELATIVE_LENGTHS = [
  'cap',
  'ch',
  'em',
  'ex',
  'ic',
  'lh',
  'rcap',
  'rch',
  'rem',
  'rex',
  'ric',
  'rlh',
];

const W3C_CONTAINER_QUERY_LENGTHS = [
  'cqb',
  'cqh',
  'cqi',
  'cqmax',
  'cqmin',
  'cqw',
];

const W3C_VIEWPORT_PERCENTAGE_LENGTHS = [
  // Default viewport
  'vb',
  'vh',
  'vi',
  'vmax',
  'vmin',
  'vw',
  // Small viewport (sv*)
  'svb',
  'svh',
  'svi',
  'svmax',
  'svmin',
  'svw',
  // Large viewport (lv*)
  'lvb',
  'lvh',
  'lvi',
  'lvmax',
  'lvmin',
  'lvw',
  // Dynamic viewport (dv*)
  'dvb',
  'dvh',
  'dvi',
  'dvmax',
  'dvmin',
  'dvw',
];

const ALL_EXPECTED_W3C_LENGTHS = [
  ...W3C_ABSOLUTE_LENGTHS,
  ...W3C_FONT_RELATIVE_LENGTHS,
  ...W3C_CONTAINER_QUERY_LENGTHS,
  ...W3C_VIEWPORT_PERCENTAGE_LENGTHS,
].toSorted();

const NON_LENGTH_CSS_UNITS = [
  // Angles (CSS Values 4 §7.1)
  'deg',
  'grad',
  'rad',
  'turn',
  // Times (CSS Values 4 §7.2)
  's',
  'ms',
  // Frequencies (CSS Values 4 §7.3)
  'hz',
  'khz',
  // Resolutions (CSS Values 4 §7.4)
  'dpi',
  'dpcm',
  'dppx',
  // Flex / percentage (CSS Grid 1 §7.2.4 & CSS Values 4 §5)
  'fr',
  '%',
];

describe('lengthUnits specification contract', () => {
  test('matches canonical W3C CSS Values 4 and Container Queries 1 length set exactly', () => {
    assert.equal(
      cssnanoUtils.lengthUnits.size,
      ALL_EXPECTED_W3C_LENGTHS.length,
      `expected exactly ${ALL_EXPECTED_W3C_LENGTHS.length} canonical length units`
    );

    const actualSorted = [...cssnanoUtils.lengthUnits].toSorted();
    assert.deepEqual(
      actualSorted,
      ALL_EXPECTED_W3C_LENGTHS,
      'exported lengthUnits set must be mathematically equal to canonical W3C length units'
    );
  });

  test('satisfies syntactic invariants for CSS length unit identifiers', () => {
    for (const unit of cssnanoUtils.lengthUnits) {
      assert.match(
        unit,
        /^[a-z]+$/,
        `unit "${unit}" must be non-empty and strictly lowercase ASCII alphabetic`
      );
    }
  });

  test('is strictly disjoint from non-length CSS dimension and percentage units', () => {
    for (const nonLengthUnit of NON_LENGTH_CSS_UNITS) {
      assert.equal(
        cssnanoUtils.lengthUnits.has(nonLengthUnit),
        false,
        `lengthUnits must not contain non-length unit "${nonLengthUnit}"`
      );
    }
  });
});
