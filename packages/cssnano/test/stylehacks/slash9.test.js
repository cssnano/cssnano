import { test } from 'node:test';
import { detectsHack } from './_detectHack.js';

test(
  'detects the ie 6-8 \\9 value hack',
  detectsHack('h1 { margin-top: 1px\\9; }')
);

test(
  'detects the ie 6-8 \\9 value hack after a comment in the property',
  detectsHack('h1 { margin-top/*\\**/: 1px\\9; }')
);

test(
  'detects the ie 6-8 \\9 value hack (uppercase)',
  detectsHack('h1 { MARGIN-TOP: 1PX\\9; }')
);

test(
  'detects the ie 6-8 \\9 value hack after a comment in the property (uppercase)',
  detectsHack('h1 { MARGIN-TOP/*\\**/: 1PX\\9; }')
);
