import test from 'ava';
import getMatchFactory from '../';

test('should get match', t => {
    const matches = [
        ['foo', ['bar', 'baz']],
        ['quux', ['bar', 'foo']],
        ['baz', ['foo', 'bar']],
    ];

    const getMatch = getMatchFactory(matches);

    t.deepEqual(getMatch(['bar', 'foo']), 'quux');
    t.false(getMatch(['quux']));
});
