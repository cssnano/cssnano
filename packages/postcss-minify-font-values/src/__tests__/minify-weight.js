import { test } from 'uvu';
import * as assert from 'uvu/assert';
import minifyWeight from '../lib/minify-weight';

test('minify-weight', () => {
  assert.is(minifyWeight('normal'), '400');
  assert.is(minifyWeight('bold'), '700');
  assert.is(minifyWeight('lighter'), 'lighter');
  assert.is(minifyWeight('bolder'), 'bolder');
});
test.run();
