'use strict';
const { test } = require('uvu');
const processCSS = require('./_processCSS');

test(
  'ie 5.5-7 important hack',
  processCSS('h1 { color: red !ie }', 'h1 { }', {
    target: 'ie6',
    unaffected: 'ie8',
  })
);

test(
  'ie 5.5-7 important hack (uppercase)',
  processCSS('H1 { COLOR: RED !IE }', 'H1 { }', {
    target: 'ie6',
    unaffected: 'ie8',
  })
);
test.run();
