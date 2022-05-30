'use strict';
const { test } = require('uvu');
const processCss = require('./_processCss');

test(
  'should minify color values in background gradients (preset)',
  processCss(
    'h1{background:linear-gradient( #ff0000,yellow )}',
    'h1{background:linear-gradient(red,#ff0)}'
  )
);

test(
  'should minify color values in background gradients (2) (preset)',
  processCss(
    'h1{background:linear-gradient(yellow, orange), linear-gradient(black, rgba(255, 255, 255, 0))}',
    'h1{background:linear-gradient(#ff0,orange),linear-gradient(#000,hsla(0,0%,100%,0))}'
  )
);

test(
  'should minify color values in background gradients (3) (preset)',
  processCss(
    'h1{background:linear-gradient(0deg, yellow, black 40%, red)}',
    'h1{background:linear-gradient(0deg,#ff0,#000 40%,red)}'
  )
);

test(
  'should minify color values (10)',
  processCss(
    'h1{text-shadow: 1px 1px 1px #F0FFFF, 1px 1px 1px #F0FFFF}',
    'h1{text-shadow:1px 1px 1px azure,1px 1px 1px azure}'
  )
);

test(
  'should bail on the "composes" property',
  processCss.passthrough('h1{composes:black from "styles"}')
);

test(
  'should not mangle empty strings',
  processCss.passthrough('h1{content:""}')
);

test(
  'should passthrough css variables',
  processCss.passthrough('h1{color:var(--foo)}')
);

test(
  'should passthrough css variables #2',
  processCss.passthrough('h1{color:var(--foo) var(--bar)}')
);

test(
  'should passthrough css variables #3',
  processCss.passthrough('h1{color:rgb(var(--foo),255,255)}')
);

test(
  'should passthrough css variables #4',
  processCss.passthrough('h1{color:rgb(255,var(--bar),255)}')
);

test(
  'should passthrough css variables #5',
  processCss.passthrough('h1{color:rgb(255,255,var(--baz))}')
);

test(
  'should passthrough css variables #6',
  processCss.passthrough('h1{color:rgb(var(--foo))}')
);

test(
  'should passthrough env function',
  processCss.passthrough('h1{color:rgb(env(foo))}')
);

test(
  'should not minify in lowercase filter properties',
  processCss.passthrough(
    'h1{filter:progid:DXImageTransform.Microsoft.gradient(startColorstr= #000000,endColorstr= #ffffff)}'
  )
);

test(
  'should not minify in uppercase filter properties',
  processCss.passthrough(
    'h1{FILTER:progid:DXImageTransform.Microsoft.gradient(startColorstr= #000000,endColorstr= #ffffff)}'
  )
);

test.run();
