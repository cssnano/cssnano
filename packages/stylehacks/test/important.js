'use strict';
const { test } = require('node:test');
const processCSS = require('./_processCSS');

test(
  'ie 5.5-7 important hack',
  processCSS('h1 { color: red !ie }', 'h1 { }', {
    target: 'IE 6',
    unaffected: 'IE 8',
  })
);

test(
  'ie 5.5-7 important hack (uppercase)',
  processCSS('H1 { COLOR: RED !IE }', 'H1 { }', {
    target: 'IE 6',
    unaffected: 'IE 8',
  })
);
