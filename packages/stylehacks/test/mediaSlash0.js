'use strict';
const { test } = require('uvu');
const processCSS = require('./_processCSS');

test(
  'ie 8 media \\0screen hack',
  processCSS('@media \\0screen { h1 { color: red } }', '', {
    target: 'ie8',
    unaffected: 'ie9',
  })
);

test(
  'ie 8 media \\0screen hack (uppercase)',
  processCSS('@MEDIA \\0SCREEN { h1 { color: red } }', '', {
    target: 'ie8',
    unaffected: 'ie9',
  })
);
test.run();
