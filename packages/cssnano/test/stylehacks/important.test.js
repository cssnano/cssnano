import { test } from 'node:test';
import { detectsHack } from './_detectHack.js';

test('ie 5.5-7 important hack', detectsHack('h1 { color: red !ie }'));

test(
  'ie 5.5-7 important hack (uppercase)',
  detectsHack('H1 { COLOR: RED !IE }')
);
