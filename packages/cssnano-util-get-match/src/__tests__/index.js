import getMatchFactory from '../';

test('should get match', () => {
  const matches = [
    ['foo', ['bar', 'baz']],
    ['quux', ['bar', 'foo']],
    ['baz', ['foo', 'bar']],
  ];

  const getMatch = getMatchFactory(matches);

  expect(getMatch(['bar', 'foo'])).toBe('quux');
  expect(getMatch(['quux'])).toBe(false);
});
