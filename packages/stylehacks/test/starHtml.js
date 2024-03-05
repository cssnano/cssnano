'use strict';
const { test } = require('uvu');
const processCSS = require('./_processCSS');

test(
  'ie 5.5-6 * html hack',
  processCSS('* html h1 { color: red }', '', {
    target: 'IE 6',
    unaffected: 'IE 7',
  })
);

test(
  'ie 5.5-6 * html hack (uppercase)',
  processCSS('* HTML H1 { color: red }', '', {
    target: 'IE 6',
    unaffected: 'IE 7',
  })
);

test(
  'should not throw error',
  processCSS(
    '.class { color: red }',
    '.class { color: red }',
    { target: 'IE 6', unaffected: 'IE 7' },
    0
  )
);

test(
  'should not throw error #2',
  processCSS(
    '* { color: red }',
    '* { color: red }',
    { target: 'IE 6', unaffected: 'IE 7' },
    0
  )
);

test(
  'should not throw error #3',
  processCSS(
    '[hidden] { color: red }',
    '[hidden] { color: red }',
    { target: 'IE 6', unaffected: 'IE 7' },
    0
  )
);
test.run();
