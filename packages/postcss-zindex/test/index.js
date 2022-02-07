'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should optimise large z-index values',
  processCSS('h1{z-index:9999}', 'h1{z-index:1}')
);

test(
  'should optimise large z-index values (2)',
  processCSS('h1{Z-INDEX:9999}', 'h1{Z-INDEX:1}')
);

test(
  'should optimise multiple ascending z-index values',
  processCSS(
    'h1{z-index:150}h2{z-index:350}h3{z-index:600}',
    'h1{z-index:1}h2{z-index:2}h3{z-index:3}'
  )
);

test(
  'should optimise multiple descending z-index values',
  processCSS(
    'h1{z-index:600}h2{z-index:350}h3{z-index:150}',
    'h1{z-index:3}h2{z-index:2}h3{z-index:1}'
  )
);

test(
  'should optimise multiple unsorted z-index values',
  processCSS(
    'h1{z-index:5}h2{z-index:500}h3{z-index:40}h4{z-index:2}',
    'h1{z-index:2}h2{z-index:4}h3{z-index:3}h4{z-index:1}'
  )
);

test(
  'should optimise !important z-index values',
  processCSS(
    'h1{z-index:1337!important}h2{z-index:9001!important}',
    'h1{z-index:1!important}h2{z-index:2!important}'
  )
);

test(
  'should not optimise negative z-index values',
  processCSS('h1{z-index:-1}h2{z-index:-2}', 'h1{z-index:-1}h2{z-index:-2}')
);

test(
  'should not convert 0 values',
  processCSS('h1{z-index:0}h2{z-index:10}', 'h1{z-index:0}h2{z-index:1}')
);

test('should not mangle inherit', passthroughCSS('h1{z-index:inherit}'));

test(
  'should not mangle auto',
  processCSS(
    'h1{z-index:auto}h2{z-index:2000}',
    'h1{z-index:auto}h2{z-index:1}'
  )
);

test(
  "should pass through when it doesn't find a z-index value",
  passthroughCSS('h1{color:#000;font-weight:bold}')
);

test(
  'should abort early if any negative z-indices were found',
  passthroughCSS(
    '.a{z-index:8}.b{z-index:-2}.c{z-index:10}.d{z-index:8}.e{z-index:6}'
  )
);

test(
  'should accept a starting index',
  processCSS('.a{z-index:20}', '.a{z-index:15}', { startIndex: 15 })
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
