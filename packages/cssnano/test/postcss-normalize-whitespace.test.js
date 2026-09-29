import { test } from 'node:test';
import processCss from './_processCss.js';

test(
  'should trim whitespace from nested functions (preset)',
  processCss(
    'h1{width:calc(10px - ( 100px / var(--test) ))}',
    'h1{width:calc(10px - 100px / var(--test))}'
  )
);
