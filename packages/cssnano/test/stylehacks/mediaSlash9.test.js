import { test } from 'node:test';
import processCSS from './_processCSS.js';

test(
  'ie 7 media screen\\9 hack',
  processCSS('@media screen\\9 { h1 { color: red } }', '', {
    target: 'IE 6',
    unaffected: 'IE 8',
  })
);

test(
  'ie 7 media screen\\9 hack (uppercase)',
  processCSS('@MEDIA SCREEN\\9 { h1 { color: red } }', '', {
    target: 'IE 6',
    unaffected: 'IE 8',
  })
);
