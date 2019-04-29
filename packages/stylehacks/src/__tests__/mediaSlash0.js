import test from 'ava';
import processCSS from './_processCSS';

test(
  'ie 8 media \\0screen hack',
  processCSS,
  '@media \\0screen { h1 { color: red } }',
  '',
  { target: 'ie8', unaffected: 'ie9' }
);

test(
  'ie 8 media \\0screen hack (uppercase)',
  processCSS,
  '@MEDIA \\0SCREEN { h1 { color: red } }',
  '',
  { target: 'ie8', unaffected: 'ie9' }
);
