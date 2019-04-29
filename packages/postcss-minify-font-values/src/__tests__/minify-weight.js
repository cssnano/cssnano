import test from 'ava';
import minifyWeight from '../lib/minify-weight';

test('minify-weight', (t) => {
  t.is(minifyWeight('normal'), '400', 'should convert normal -> 400');
  t.is(minifyWeight('bold'), '700', 'should convert bold -> 700');
  t.is(minifyWeight('lighter'), 'lighter', "shouldn't convert lighter");
  t.is(minifyWeight('bolder'), 'bolder', "shouldn't convert bolder");
});
