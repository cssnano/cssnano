'use strict';
const { test } = require('uvu');
const processCSS = require('./_processCSS');

test(
  'firefox empty body hack',
  processCSS('body:empty h1 { color: red }', '', {
    target: 'firefox2',
    unaffected: 'chrome58',
  })
);

test(
  'firefox empty body hack (uppercase)',
  processCSS('BODY:EMPTY h1 { color: red }', '', {
    target: 'firefox2',
    unaffected: 'chrome58',
  })
);
test.run();
