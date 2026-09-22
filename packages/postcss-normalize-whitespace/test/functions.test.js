import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

test(
  'should trim whitespace from nested functions',
  processCSS(
    'h1{width:calc(10px - ( 100px / var(--test) ))}',
    'h1{width:calc(10px - (100px / var(--test)))}'
  )
);

test(
  'should trim whitespace from regular functions, commas and dividers',
  processCSS(
    'a{transform:translate( 1px , 2px ) scale( 1 / 2 )}',
    'a{transform:translate(1px,2px) scale(1/2)}'
  )
);

test(
  'should trim slash whitespace in non-math functions such as color alpha dividers',
  processCSS(
    'a{color:hsl( 0 0% 0% / 0.5 );background:rgb( 255 0 0 / 50% )}',
    'a{color:hsl(0 0% 0%/0.5);background:rgb(255 0 0/50%)}'
  )
);
