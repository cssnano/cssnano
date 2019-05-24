import test from 'ava';
import processCSS from './_processCSS';

const opts = { target: 'ie7', unaffected: 'ie8' };

function testStarHack(t, character) {
  return processCSS(t, `h1 { ${character}color: red }`, `h1 { }`, opts);
}

test('*', testStarHack, '*');
test('!', testStarHack, '!');
test('$', testStarHack, '$');
test('&', testStarHack, '&');
test(')', testStarHack, ')');
test('=', testStarHack, '=');
test('%', testStarHack, '%');
test('+', testStarHack, '+');
test(',', testStarHack, ',');
test('.', testStarHack, '.');
test('/', testStarHack, '/');
test('`', testStarHack, '`');
test(']', testStarHack, ']');
test('#', testStarHack, '#');
test('~', testStarHack, '~');
test('?', testStarHack, '?');
test(':', testStarHack, ':');
test('|', testStarHack, '|');

test(
  'should also handle @hacks',
  processCSS,
  'h1 { @color: red }',
  'h1 {}',
  opts
);

test(
  'should also handle @hacks (uppercase)',
  processCSS,
  'h1 { @COLOR: red }',
  'h1 {}',
  opts
);
