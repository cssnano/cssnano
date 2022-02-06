'use strict';
const { test } = require('uvu');
const processCSS = require('./_processCSS');

test(
  'ie <= 8 media \\0screen\\,screen\\9 hack',
  processCSS('@media \\0screen\\,screen\\9 { h1 { color: red } }', '', {
    target: 'ie6',
    unaffected: 'ie9',
  })
);

test(
  'ie <= 8 media \\0screen\\,screen\\9 hack (uppercase)',
  processCSS('@MEDIA \\0SCREEN\\,SCREEN\\9 { h1 { color: red } }', '', {
    target: 'ie6',
    unaffected: 'ie9',
  })
);
test.run();
