'use strict';
const { test } = require('node:test');
const processCSS = require('./_processCSS');

test(
  'ie 8 media \\0screen hack',
  processCSS('@media \\0screen { h1 { color: red } }', '', {
    target: 'IE 8',
    unaffected: 'IE 9',
  })
);

test(
  'ie 8 media \\0screen hack (uppercase)',
  processCSS('@MEDIA \\0SCREEN { h1 { color: red } }', '', {
    target: 'IE 8',
    unaffected: 'IE 9',
  })
);
