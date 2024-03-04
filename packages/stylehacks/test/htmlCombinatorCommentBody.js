'use strict';
const { test } = require('uvu');
const processCSS = require('./_processCSS');

test(
  'html combinator comment body hack',
  processCSS('html > /**/ body h1 { color: red }', '', {
    target: 'IE 6',
    unaffected: 'IE 8',
  })
);

test(
  'html combinator comment body hack (uppercase)',
  processCSS('HTML > /**/ BODY H1 { color: red }', '', {
    target: 'IE 6',
    unaffected: 'IE 8',
  })
);

test(
  'html combinator comment body hack (2)',
  processCSS('html ~ /**/ body h1 { color: red }', '', {
    target: 'IE 6',
    unaffected: 'IE 8',
  })
);
test.run();
