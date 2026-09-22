import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

test(
  'should trim whitespace surrounding custom property name in var()',
  processCSS('h1{color:var(  --custom  )}', 'h1{color:var(--custom)}')
);

test(
  'should trim whitespace surrounding identifier in env()',
  processCSS(
    'h1{color:env(  safe-area-inset-top  )}',
    'h1{color:env(safe-area-inset-top)}'
  )
);

test(
  'should trim whitespace surrounding identifier in constant()',
  processCSS(
    'h1{color:constant(  safe-area-inset-top  )}',
    'h1{color:constant(safe-area-inset-top)}'
  )
);

test(
  'should trim whitespace surrounding custom property name in uppercase VAR()',
  processCSS('h1{color:VAR(  --custom  )}', 'h1{color:VAR(--custom)}')
);

test(
  'should trim whitespace surrounding identifier in uppercase ENV()',
  processCSS('h1{color:ENV(  safe-area  )}', 'h1{color:ENV(safe-area)}')
);

test(
  'should trim whitespace surrounding identifier in uppercase CONSTANT()',
  processCSS(
    'h1{color:CONSTANT(  safe-area  )}',
    'h1{color:CONSTANT(safe-area)}'
  )
);

test(
  'should trim boundary whitespace in indexed env() while preserving required index spacing',
  processCSS(
    'h1{color:env(  viewport-segment-width 0 0  )}',
    'h1{color:env(viewport-segment-width 0 0)}'
  )
);

test(
  'should trim boundary whitespace and separator comma in indexed env() with fallback',
  processCSS(
    'h1{color:env(  viewport-segment-width 0 0  ,  10px  )}',
    'h1{color:env(viewport-segment-width 0 0,10px)}'
  )
);

test(
  'should trim whitespace surrounding custom property name in escaped var()',
  processCSS('h1{color:v\\61r(  --custom  )}', 'h1{color:v\\61r(--custom)}')
);

test(
  'should trim whitespace before and after first comma in escaped var() with fallback',
  processCSS(
    'h1{color:v\\61r(  --custom  ,  10px  )}',
    'h1{color:v\\61r(--custom,10px)}'
  )
);

test(
  'should trim whitespace surrounding identifier in escaped env()',
  processCSS('h1{color:\\65nv(  safe-area  )}', 'h1{color:\\65nv(safe-area)}')
);
