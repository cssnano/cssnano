import { test } from 'node:test';
import { detectsHack } from './_detectHack.js';

function testStarHack(character) {
  return detectsHack(`h1 { ${character}color: red }`);
}

test('*', testStarHack('*'));
test('!', testStarHack('!'));
test('$', testStarHack('$'));
test('&', testStarHack('&'));
test(')', testStarHack(')'));
test('=', testStarHack('='));
test('%', testStarHack('%'));
test('+', testStarHack('+'));
test(',', testStarHack(','));
test('.', testStarHack('.'));
test('/', testStarHack('/'));
test('`', testStarHack('`'));
test(']', testStarHack(']'));
test('#', testStarHack('#'));
test('~', testStarHack('~'));
test('?', testStarHack('?'));
test(':', testStarHack(':'));
test('|', testStarHack('|'));
