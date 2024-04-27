'use strict';
const { test } = require('node:test');
const processCSS = require('./_processCSS');

test(
  'ie <= 8 media \\0screen\\,screen\\9 hack',
  processCSS('@media \\0screen\\,screen\\9 { h1 { color: red } }', '', {
    target: 'IE 6',
    unaffected: 'IE 9',
  })
);

test(
  'ie <= 8 media \\0screen\\,screen\\9 hack (uppercase)',
  processCSS('@MEDIA \\0SCREEN\\,SCREEN\\9 { h1 { color: red } }', '', {
    target: 'IE 6',
    unaffected: 'IE 9',
  })
);
