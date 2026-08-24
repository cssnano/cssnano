import nodetest from 'node:test';
import processCSS from './_processCSS.js';

const { test } = nodetest;
test(
  'firefox empty body hack',
  processCSS('body:empty h1 { color: red }', '', {
    target: 'Firefox 2',
    unaffected: 'Chrome 58',
  })
);

test(
  'firefox empty body hack (uppercase)',
  processCSS('BODY:EMPTY h1 { color: red }', '', {
    target: 'Firefox 2',
    unaffected: 'Chrome 58',
  })
);
