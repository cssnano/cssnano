'use strict';
const { test } = require('uvu');
const processCss = require('./_processCss');

test(
  'should remove duplicate rules',
  processCss('h1{font-weight:700}h1{font-weight:700}', 'h1{font-weight:700}')
);

test(
  'should remove duplicate declarations',
  processCss('h1{font-weight:700;font-weight:700}', 'h1{font-weight:700}')
);

test(
  'should remove duplicates inside @media queries',
  processCss(
    '@media print{h1{display:block}h1{display:block}}',
    '@media print{h1{display:block}}'
  )
);

test(
  'should remove duplicate @media queries',
  processCss(
    '@media print{h1{display:block}}@media print{h1{display:block}}',
    '@media print{h1{display:block}}'
  )
);

test(
  'should remove declarations before rules',
  processCss(
    'h1{font-weight:700;font-weight:700}h1{font-weight:700}',
    'h1{font-weight:700}'
  )
);

test(
  'should not remove declarations when selectors are different',
  processCss('h1{font-weight:700}h2{font-weight:700}', 'h1,h2{font-weight:700}')
);

test(
  'should not remove across contexts',
  processCss(
    'h1{display:block}@media print{h1{display:block}}',
    'h1{display:block}@media print{h1{display:block}}'
  )
);
test.run();
