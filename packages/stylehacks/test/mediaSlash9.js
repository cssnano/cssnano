'use strict';
const { test } = require('uvu');
const processCSS = require('./_processCSS');

test(
  'ie 7 media screen\\9 hack',
  processCSS('@media screen\\9 { h1 { color: red } }', '', {
    target: 'ie6',
    unaffected: 'ie8',
  })
);

test(
  'ie 7 media screen\\9 hack (uppercase)',
  processCSS('@MEDIA SCREEN\\9 { h1 { color: red } }', '', {
    target: 'ie6',
    unaffected: 'ie8',
  })
);
test.run();
