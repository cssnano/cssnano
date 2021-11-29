import { test } from 'uvu';
import * as assert from 'uvu/assert';
import getMatchFactory from '../getMatch';

test('should get match', () => {
  const matches = [
    ['foo', ['bar', 'baz']],
    ['quux', ['bar', 'foo']],
    ['baz', ['foo', 'bar']],
  ];

  const getMatch = getMatchFactory(matches);

  assert.is(getMatch(['bar', 'foo']), 'quux');
  assert.is(getMatch(['quux']), false);
});
test.run();
