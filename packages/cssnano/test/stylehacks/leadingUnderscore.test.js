import { test } from 'node:test';
import { detectsHack, detectsNoHack } from './_detectHack.js';

test('ie 6 underscore hack', detectsHack('h1 { _color: red }'));

test('ie 6 underscore hack (uppercase)', detectsHack('h1 { _COLOR: red }'));

test('ie 6 hyphen hack', detectsHack('h1 { -color: red }'));

test('ie 6 hyphen hack (uppercase)', detectsHack('h1 { -COLOR: red }'));

test(
  'prefixed value must be ignored',
  detectsNoHack('h1 { -moz-tab-size: 10px }')
);

test(
  'prefixed value must be ignored (uppercase)',
  detectsNoHack('h1 { -MOZ-TAB-SIZE: 10px }')
);

test(
  'custom property must be ignored',
  detectsNoHack('h1 { --color-foobar: #000; }')
);

test(
  'custom property must be ignored (uppercase)',
  detectsNoHack('h1 { --COLOR-FOOBAR: #000; }')
);
