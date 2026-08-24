import nodetest from 'node:test';
import processCSS from './_processCSS.js';

const { test } = nodetest;
test(
  'opera html:first-child hack',
  processCSS('html:first-child h1 { color: red }', '', {
    target: 'opera9',
    unaffected: 'Chrome 58',
  })
);

test(
  'opera html:first-child hack (uppercase)',
  processCSS('HTML:FIRST-CHILD H1 { color: red }', '', {
    target: 'opera9',
    unaffected: 'Chrome 58',
  })
);
