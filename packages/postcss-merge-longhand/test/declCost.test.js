import { test } from 'node:test';
import assert from 'node:assert/strict';
import { declCost } from '../src/lib/decl/slotVector.js';

/* `declCost` owns the byte cost shared by the slot-vector reducers and the
 * border candidate comparison. Anchor it to the serialized declaration rather
 * than restating the formula. */

test('prices a declaration at its property, value and separators', () => {
  assert.strictEqual(
    declCost('border-top-width', '1px', false),
    'border-top-width:1px;'.length
  );
});

test('prices `!important` as a constant annotation', () => {
  for (const [prop, value] of [
    ['color', 'red'],
    ['border-top-width', '1px'],
    ['margin', '0 auto'],
  ]) {
    assert.strictEqual(
      declCost(prop, value, true) - declCost(prop, value, false),
      '!important'.length
    );
  }
});
