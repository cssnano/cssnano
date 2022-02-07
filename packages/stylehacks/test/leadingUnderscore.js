'use strict';
const { test } = require('uvu');
const processCSS = require('./_processCSS');

test(
  'ie 6 underscore hack',
  processCSS('h1 { _color: red }', 'h1 { }', {
    target: 'ie6',
    unaffected: 'ie7',
  })
);

test(
  'ie 6 underscore hack (uppercase)',
  processCSS('h1 { _COLOR: red }', 'h1 { }', {
    target: 'ie6',
    unaffected: 'ie7',
  })
);

test(
  'ie 6 hyphen hack',
  processCSS('h1 { -color: red }', 'h1 { }', {
    target: 'ie6',
    unaffected: 'ie7',
  })
);

test(
  'ie 6 hyphen hack (uppercase)',
  processCSS('h1 { -COLOR: red }', 'h1 { }', {
    target: 'ie6',
    unaffected: 'ie7',
  })
);

test(
  'prefixed value must be ignored',
  processCSS(
    'h1 { -moz-tab-size: 10px }',
    'h1 { -moz-tab-size: 10px }',
    { target: 'ie6', unaffected: 'ie7' },
    0
  )
);

test(
  'prefixed value must be ignored (uppercase)',
  processCSS(
    'h1 { -MOZ-TAB-SIZE: 10px }',
    'h1 { -MOZ-TAB-SIZE: 10px }',
    { target: 'ie6', unaffected: 'ie7' },
    0
  )
);

test(
  'custom property must be ignored',
  processCSS(
    'h1 { --color-foobar: #000; }',
    'h1 { --color-foobar: #000; }',
    { target: 'ie6', unaffected: 'ie7' },
    0
  )
);

test(
  'custom property must be ignored (uppercase)',
  processCSS(
    'h1 { --COLOR-FOOBAR: #000; }',
    'h1 { --COLOR-FOOBAR: #000; }',
    { target: 'ie6', unaffected: 'ie7' },
    0
  )
);
test.run();
