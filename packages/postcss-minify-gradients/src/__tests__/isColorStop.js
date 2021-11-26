import { test } from 'uvu';
import * as assert from 'uvu/assert';
import isColorStop from '../isColorStop.js';

test('should recognise color stops', () => {
  assert.is(isColorStop('yellow'), true);
  assert.is(isColorStop('yellow', '12px'), true);
  assert.is(isColorStop('yellow', 'px'), false);
  assert.is(isColorStop('yellow', 'calc(100%)'), true);
  assert.is(isColorStop(undefined), false);
});
test.run();
