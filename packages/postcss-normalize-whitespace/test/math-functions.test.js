import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

test(
  'should preserve calc whitespace around operators and trim its boundaries',
  processCSS(
    'a{width:calc( 100% - ( 10px / 2 ) )}',
    'a{width:calc(100% - (10px / 2))}'
  )
);

test(
  'should preserve division whitespace in modern math functions while trimming commas',
  processCSS(
    'a{width:min( 100px , 1 / 2 );height:clamp( 1px , 1 / 2 , 5px )}',
    'a{width:min(100px,1 / 2);height:clamp(1px,1 / 2,5px)}'
  )
);

test(
  'should trim comma whitespace inside nested math functions in calc',
  processCSS(
    'a{width:calc( min( 10px , 20px ) + clamp( 1px , 2px , 3px ) )}',
    'a{width:calc(min(10px,20px) + clamp(1px,2px,3px))}'
  )
);

test(
  'should preserve division whitespace in uppercase math functions',
  processCSS(
    'a{width:MIN( 100px , 1 / 2 );height:CLAMP( 1px , 1 / 2 , 5px )}',
    'a{width:MIN(100px,1 / 2);height:CLAMP(1px,1 / 2,5px)}'
  )
);

test(
  'should preserve division whitespace in stepped, trig, and nested math functions',
  processCSS(
    'a{width:round( 1 / 2 , 1px );transform:rotate(atan2( 1 / 2 , 3 / 4 ));max-width:clamp( 1px , min( 100px , 1 / 2 ) , 5px )}',
    'a{width:round(1 / 2,1px);transform:rotate(atan2(1 / 2,3 / 4));max-width:clamp(1px,min(100px,1 / 2),5px)}'
  )
);

test(
  'should normalize nested calc, variable functions and blocks',
  processCSS(
    'a{x:calc( var(--x, env(safe-area-inset-top, )) + constant(--y, [ 1px / ( 2px ) ]) )}',
    'a{x:calc(var(--x,env(safe-area-inset-top, )) + constant(--y,[ 1px / (2px) ]))}'
  )
);

test(
  'should trim whitespace from nested functions (uppercase "calc")',
  processCSS(
    'h1{width:CALC(10px - ( 100px / var(--test) ))}',
    'h1{width:CALC(10px - (100px / var(--test)))}'
  )
);

test(
  'should retain whitespace around division in escaped math functions',
  processCSS('h1{width:c\\61lc(10px / 2)}', 'h1{width:c\\61lc(10px / 2)}')
);
