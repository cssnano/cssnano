import nodetest from 'node:test';
import processCss from './_processCss.js';

const { test } = nodetest;
test(
  'should trim whitespace from nested functions (preset)',
  processCss(
    'h1{width:calc(10px - ( 100px / var(--test) ))}',
    'h1{width:calc(10px - 100px/var(--test))}'
  )
);
