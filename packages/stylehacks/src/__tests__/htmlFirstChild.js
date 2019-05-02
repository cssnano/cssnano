import test from 'ava';
import processCSS from './_processCSS';

test(
  'opera html:first-child hack',
  processCSS,
  'html:first-child h1 { color: red }',
  '',
  { target: 'opera9', unaffected: 'chrome58' }
);

test(
  'opera html:first-child hack (uppercase)',
  processCSS,
  'HTML:FIRST-CHILD H1 { color: red }',
  '',
  { target: 'opera9', unaffected: 'chrome58' }
);
