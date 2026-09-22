import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from 'cssnano-utils';
import { outputFor } from '../script/lib/fuzzCheck.js';

const { lengthUnits } = cssnanoUtils;

// The zero-position contract must hold for the whole CSS Values 4 <length>
// production, including the font-relative, container query, and modern
// viewport units, not only the handful the fuzzer's position pool spells out.

test('should clamp a zero position in every CSS length unit to a unitless zero', () => {
  for (const unit of lengthUnits)
    assert.equal(
      outputFor(`a{background-image:linear-gradient(red 50%, blue 0${unit})}`),
      'linear-gradient(red 50%, blue 0)',
      `0${unit}`
    );
});

test('should drop a zero first-stop position in every CSS length unit', () => {
  for (const unit of lengthUnits)
    assert.equal(
      outputFor(`a{background-image:linear-gradient(red 0${unit}, blue)}`),
      'linear-gradient(red, blue)',
      `0${unit}`
    );
});

// CSS units are ASCII case-insensitive, so every unit family must clamp
// however it is cased. The sweep drives the whole shared `lengthUnits` set;
// that set's completeness against CSS Values 4 is the cssnano-utils oracle
// test's contract, so a missing unit fails there before it can hide here.
test('should clamp a zero position spelled with uppercase length units', () => {
  for (const unit of lengthUnits)
    assert.equal(
      outputFor(
        `a{background-image:linear-gradient(red 50%, blue 0${unit.toUpperCase()})}`
      ),
      'linear-gradient(red 50%, blue 0)',
      `0${unit.toUpperCase()}`
    );
});

test('should keep a zero position whose unit is neither a length nor a percentage', () => {
  for (const position of ['0deg', '0s'])
    assert.equal(
      outputFor(
        `a{background-image:linear-gradient(red 50%, blue ${position})}`
      ),
      `linear-gradient(red 50%, blue ${position})`,
      position
    );
});
