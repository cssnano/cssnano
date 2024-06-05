'use strict';
const { test } = require('node:test');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');
const plugin = require('../src/index.js');

const { processCSS } = processCSSFactory(plugin);

test(
  'should deduplicate selectors',
  processCSS('h1,h1,h1,h1{color:red}', 'h1{color:red}')
);

test(
  'should sort selectors',
  processCSS('h1,h10,H2,h7{color:red}', 'H2,h1,h10,h7{color:red}')
);

test(
  'should keep comments in the selector',
  processCSS(
    '.newbackbtn,/*.searchall,*/.calNav{padding:5px;}',
    '/*.searchall,*/.calNav,.newbackbtn{padding:5px;}'
  )
);

test(
  'should keep comments in the selector (2)',
  processCSS(
    '.x/*a*/,/*b*/.y/*c*/,.x,.y{padding:5px;}',
    '.x/*a*/,/*b*/.y/*c*/{padding:5px;}'
  )
);
test(
  'should keep comments in the selector (3)',
  processCSS(
    '.x,.y,/*a*/.x/*b*/,/*c*/.y/*d*/{padding:5px;}',
    '.x/*a*//*b*/,.y/*c*//*d*/{padding:5px;}'
  )
);
test(
  'should keep comments in the selector (4)',
  processCSS(
    ':is(/*a*/.x/*b*/,/*c*/.y/*d*/), :is(.x,.y),{padding:5px;}',
    ':is(/*a*/.x/*b*/,/*c*/.y/*d*/){padding:5px;}'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
